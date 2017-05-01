SM.savedViews = pinCount: 1

# Initialise this model
SM.savedViews.init = ->

  if ( !(typeof $('body').attr('id') == 'undefined') )
    SM.savedViews.controller = $('body').attr('id').split('-')[0]

  if SM.savedViews.controller == 'vehicles' && $('#sm-body').hasClass('vehicle_diaries')
    SM.savedViews.controller = 'diary'

  SM.savedViews.containerRef = '#sv-container'

  SM.savedViews.toggleButtonRef = '#show-views'

  SM.savedViews.shared = false
  SM.savedViews.dirty = false
  SM.savedViews.displayed = false
  SM.savedViews.formOpen = false
  SM.savedViews.indexLoaded = false
  SM.savedViews.saveNew = false
  SM.savedViews.numInternalRecipients = 0
  SM.savedViews.numSharedWith = 0
  SM.savedViews.pinCount = 0
  SM.savedViews.searchInput = $('#search')
  SM.savedViews.searchForm = SM.savedViews.searchInput.closest 'form'
  SM.savedViews.shared_users = []
  SM.savedViews.scheduled_users = []

  SM.savedViews.clearSelected()

  SM.savedViews.bind()

  SM.savedViews.preSelectTab()

SM.savedViews.bind = ->
  searchInput = $('#search')

  $(document).ready ->
    SM.savedViews.viewChanged()

  $(document.body).on SM.events.click, "#sv-sharing-tab .sv-share-user input", (e) ->
    tgt = $(e.target)
    SM.savedViews.toggleUser(true, tgt.val(), tgt.prop('checked'), tgt)

  $(document.body).on SM.events.click, "#sv-sharing-tab .sv-share-user a.delete", (e) ->
    e.preventDefault()
    user_id = $('input',$(e.target).closest('label')).val()
    tgt = $(".sv-share-col2 .sv-share-user input[value='" + user_id + "']")
    SM.savedViews.toggleUser(true, user_id, false, tgt)

  $(document.body).on SM.events.click, "#sv-sharing-tab a.sv-share-removeall", (e) ->
    e.preventDefault()
    SM.savedViews.removeAllSharing()

  $(document.body).on SM.events.click, "#sv-sharing-tab .sv-share-selectedusers a.schedule-btn", (e) ->
    e.preventDefault()
    tgt = $(e.target).closest('a')
    user_id = $('input',tgt.closest('label')).val()
    SM.savedViews.toggleScheduled(user_id, !tgt.hasClass('scheduled'), tgt)

  $(document.body).on SM.events.click, "#sv-sharing-tab .sv-share-site > label > input", (e) ->
    tgt = $(e.target)
    SM.savedViews.toggleSite(true, tgt.val(), tgt.prop('checked'), tgt)

  $(document.body).on SM.events.click, "#sv-sharing-tab .sv-share-site > label a.delete", (e) ->
    e.preventDefault()
    site_id = $('input',$(e.target).closest('label')).val()
    tgt = $(".sv-share-col2 .sv-share-site input[value='" + site_id + "']")
    SM.savedViews.toggleSite(true, site_id, false, tgt)

  $(document.body).on 'blur', "#sv_label", (e) ->
    tgt = $(e.target)
    SM.savedViews.setLabel(tgt.val())

  $(document.body).on 'keyup', "#sv_label", (e) ->
    tgt = $(e.target)
    SM.savedViews.validate()

  $(document.body).on 'keyup', "#sv-sharing-tab .sv-share-allusers-search", (e) ->
    tgt = $(e.target)
    SM.savedViews.filterUsers(tgt.val())

  $(document.body).on SM.events.click, "#sv-remove-search", (e) ->
    e.preventDefault()
    $("#sv-sharing-tab .sv-share-allusers-search").val('')
    SM.savedViews.filterUsers('')

  $(document.body).on SM.events.click, SM.savedViews.containerRef + ' .sv-row', (e) ->
    row = $(e.target).closest('.sv-row')
    SM.savedViews.selectView(row.data('id'), true)

  $(document.body).on SM.events.click, SM.savedViews.containerRef + ' .sv-create-new-btn', (e) ->
    e.preventDefault()
    e.stopPropagation()
    SM.savedViews.showNew()

  $(document.body).on SM.events.click, SM.savedViews.containerRef + ' .sv-close-create-new-btn', (e) ->
    e.preventDefault()
    e.stopPropagation()
    SM.savedViews.closeAndShowNew()

  $(document.body).on SM.events.click, SM.savedViews.containerRef + ' #sv-delete-btn', (e) ->
    e.preventDefault()
    msg = ''
    if SM.savedViews.numSharedWith>0
      msg = 'This will also delete the view from the ' + SM.pluralise(SM.savedViews.numSharedWith,'user') +
      msg += ' you\'re sharing it with'
    SM.message.showConfirm 'Really delete this view?', (->
      SM.savedViews.delete SM.savedViews.selectedViewID
    ), null, msg

  $(document.body).on SM.events.click, SM.savedViews.containerRef + ' .sv-edit-btn', (e) ->
    e.preventDefault()
    e.stopPropagation()

    url = $(e.target).closest('a').attr('href')
    SM.savedViews.showEdit(url)

    # select the view if it's not already selected - but
    id = $(e.target).closest('.sv-row').data('id')
    if id != SM.savedViews.selectedViewID
      setTimeout (->
        SM.savedViews.selectView(id, true)
        return
      ), 1000

  $(document.body).on SM.events.click, '#sv-edit, #sv-overlay', (e) ->
    if 'sv-edit,sv-overlay'.indexOf($(e.target).attr('id'))!=-1
      SM.savedViews.hideEdit()

  $(document.body).on SM.events.click, "#sv-close-btn", (e) ->
    # check for changes?
    SM.savedViews.hideEdit()

  $(document.body).on SM.events.click, SM.savedViews.containerRef + ' .another', (e) ->
    SM.savedViews.displayContainer false
    SM.savedViews.displayContainer true

  $(document.body).on SM.events.click, "#sv-save-btn", (e) ->
    SM.savedViews.copyCriteria()
    SM.savedViews.doSave()

  $(document.body).on SM.events.click, SM.savedViews.toggleButtonRef, (e) ->
    e.preventDefault()
    SM.savedViews.displayContainer not $(this).hasClass('active')

  $(document.body).on "ajax:error", SM.savedViews.containerRef, (evt, data, status, xhr) ->
    if data.status is 422
      errors = $.parseJSON(data.responseText)
      errs = for attr, messages of errors
        "#{message}" for message in messages
    if data.status is 500
      errs = 'Server error.  Please try again'
    SM.savedViews.showError(errs)
    $('#sv-save-btn').html('Save').removeClass('disabled')


  $(document.body).on "ajax:success", SM.savedViews.containerRef, (evt, data, status, xhr) ->
    $('#sv-save-btn').html('Saved').removeClass('btn-primary').addClass('btn-success')
    setTimeout (->
      SM.savedViews.hideEdit()
      SM.savedViews.loadIndex()
      return
    ), 1000

  $(document.body).on SM.events.click, SM.savedViews.containerRef + ' .close', (e) ->
    e.preventDefault()
    SM.savedViews.displayContainer false

  $(document.body).on SM.events.click, "#pinned-view-list button.close", (e) ->
    e.preventDefault()
    e.stopPropagation()
    id = $(this).closest('a').attr('id').split('-')[1]
    $(SM.savedViews.containerRef + " #search-" + id).closest("li").find("b button.pin-search.active").removeClass("active")

    # Clear sub_search
    if $(this).closest('li').hasClass 'active'
      SM.savedViews.clearForm()
      SM.savedViews.resetTabs()

    # Remove tab
    $(this).closest('li').remove()

    # Remove persistence
    SM.savedViews.persistPinned id, true

    if !$('#pinned-view-list li').length
      $('#pinned-view-tabs').addClass 'hide'

  $(document.body).on SM.events.click, "#pinned-view-list a", (e) ->
    e.preventDefault()
    e.stopPropagation()

    id = $(this).attr('id').split('-')[1]

    if SM.savedViews.indexLoaded
      SM.savedViews.selectView(id, true)
    else
      SM.savedViews.updateSearchParams $(this)
      SM.manualSearchUpdate()
      SM.savedViews.resetTabs()

    $(this).closest('li').addClass 'active'

  $(document.body).on SM.events.click, ".clear-sub-search", (e) ->
    e.preventDefault()
    SM.savedViews.clearForm()

  SM.savedViews.buildTabs()


SM.savedViews.closeAndShowNew = ->
  SM.savedViews.hideEdit()
  SM.savedViews.clearSelected()
  setTimeout (->
    SM.savedViews.showNew()
  ), 3000

SM.savedViews.clearSelected = ->
  SM.savedViews.selectedViewID = -1
  SM.savedViews.selectedViewForm = null

SM.savedViews.displayContainer = (display) ->
  display = !!display # Force display to be boolean
  SM.savedViews.displayed = display
  $(SM.savedViews.containerRef)[(if display then 'show' else 'hide')]()
  $(SM.savedViews.toggleButtonRef)[(if display then "addClass" else "removeClass")] "active"
  if display
    SM.savedViews.loadIndex()
    #showSearchForm()
  else
    $(SM.savedViews.containerRef + ' .messages').text ''
    $(SM.savedViews.containerRef + ' ul a.search').popover('destroy')
  $(SM.savedViews.containerRef).trigger 'toggleSavedSearches'

SM.savedViews.updateSearchParams = (link) ->
  # Get the query string from the link & turn it into an object to enable getters
  search = link.data("url")
  search = search.split("?")[1] if search
  search = link[0].search?.substr 1 unless search
  SM.populateFormFromSearchParams(search)

SM.savedViews.loadIndex = ->
  $.get ['/users/', SM.currentUser.id, '/saved_views/', SM.savedViews.controller].join(''), (data) ->
    SM.savedViews.indexLoaded = true
    $("#sv-index").html(data)
    SM.savedViews.preSelectView()
    SM.savedViews.formatTokensInIndex()
    SM.savedViews.buildTabs()
    if SM.savedViews.saveNew
      SM.savedViews.saveNew = false
      SM.savedViews.showNew()

SM.savedViews.preSelectView = ->
  saved_view_id = $('#saved_view_id').val()
  if saved_view_id
    SM.savedViews.selectView(saved_view_id, false)

SM.savedViews.preSelectTab = ->
  qs = new SM.QueryString()
  saved_view_id = qs.get('saved_view_id')
  $('#pinnedView-'+saved_view_id).parent().addClass('active')

SM.savedViews.formatTokensInIndex = ->
  $.each $('#sv-index .sv-tokens.unformatted'), (key, tgt) ->
    SM.savedViews.formatTokens($(tgt))

SM.savedViews.formatTokens = (elm) ->
  arr = SM.stringToTokens(elm.html(), SM.model_path)
  elm.html(SM.savedViews.arrToTokens(arr))

SM.savedViews.formatColumns = (str) ->
  arr = str.split(',')
  cols = []
  a = 0
  while a < arr.length
    col = arr[a].trim()
    i = 0
    while i < SM.columns.length
      if col is SM.columns[i][0]
        cols.push SM.columns[i][1]
      i++
    a++
  cols.join(', ')

SM.savedViews.arrToTokens = (arr) ->
  $.map arr, (item) ->
    if item.name.includes("*GROUPED*")
      '<div class="token grouped">grouped by: ' + item.name.split(':')[0] + '</div>'
    else
      '<div class="token">' + item.name + '</div>'

SM.savedViews.unselectView = ->
  $(SM.savedViews.containerRef + ' .sv-row.selected').removeClass('selected')

SM.savedViews.selectView = (id, run_search) ->
  SM.savedViews.unselectView()
  SM.savedViews.selectedViewID = id
  row = $(SM.savedViews.containerRef + ' .sv-row[data-id='+id+']')
  row.addClass('selected')
  if run_search
    SM.savedViews.updateSearchParams row
    SM.manualSearchUpdate()
    SM.savedViews.resetTabs()
    $('#pinnedView-'+id).parent().addClass('active')
    SM.savedViews.copyForm()

SM.savedViews.copyForm = ->
  SM.savedViews.selectedViewForm = SM.savedViews.searchForm.serialize()

SM.savedViews.viewChanged = ->
  SM.savedViews.copyForm()
  if SM.savedViews.formOpen
    SM.savedViews.updateForm()

SM.savedViews.viewManuallyChanged = ->
  if SM.savedViews.formOpen
    # editting
  else
    $('#saved_view_id').val('')
    SM.savedViews.unselectView()

SM.savedViews.updateForm = ->
  if SM.savedViews.formOpen
    SM.savedViews.copyCriteria()
  else
    if (SM.savedViews.selectedViewID != Number($('#saved_view_id').val()))
      SM.savedViews.unselectView()

SM.savedViews.copyCriteria = ->
  return if SM.savedViews.shared
  criteria = SM.savedViews.selectedViewForm
  criteria = criteria.split('&saved_view_id='+SM.savedViews.selectedViewID).join('')
  criteria = criteria.split('&saved_view_id=').join('')
  $('#saved_view_criteria').val criteria

SM.savedViews.doSave = ->
  SM.savedViews.hideError()
  if SM.savedViews.validate()
    $('#sv-save-btn').html('Saving...').addClass('disabled')
    $('form.sv-edit-form').submit()

SM.savedViews.hideEdit = ->
  SM.savedViews.hideOverlay()
  $('#sv-edit').html('')
  SM.savedViews.formOpen = false

SM.savedViews.showEdit = (url) ->
  SM.savedViews.showOverlay()
  $.get url, (data) ->
    $('#sv-edit').html(data)
    SM.savedViews.formOpen = true
    SM.savedViews.initForm()

SM.savedViews.saveCurrent = ->
  if SM.savedViews.indexLoaded
    if SM.savedViews.formOpen
      SM.savedViews.hideEdit()
    SM.savedViews.showNew()
  else
    SM.savedViews.saveNew = true
    SM.savedViews.displayContainer(true)

SM.savedViews.initForm = ->
  SM.savedViews.scheduledReport = new SM.ScheduledReport(SM.savedViews)
  SM.savedViews.initSharing()

SM.savedViews.showNew = ->
  SM.savedViews.copyForm()
  SM.savedViews.showOverlay()
  $.get '/saved_views/new/?ctrlr=' + SM.savedViews.controller, (data) ->
    $('#sv-edit').html(data)
    SM.savedViews.formOpen = true
    SM.savedViews.initForm()
    $('#saved_view_ctrlr').val(SM.savedViews.controller)
    $('#saved_view_user_id').val(SM.currentUser.id)
    SM.savedViews.updateForm()
    SM.savedViews.initLabel()

SM.savedViews.initLabel = ->
  tokens = SM.savedViews.textToNames(SM.savedViews.searchInput.val(), SM.savedViews.controller)
  tokens = tokens.replace /[()"]/g, ''
  tokens = tokens.split(' AND ')
  nm = []
  for t in tokens
    if t.indexOf(':')==-1
      nm.push(t)
    else
      pair = t.split(':')
      if pair[1].toLowerCase() in ['true','false','yes','no']
      else
        nm.push(pair[1])

  SM.savedViews.setLabel(nm.join(' '))

SM.savedViews.setLabel = (str) ->
  $('#sv_label').val(str.trim().substr(0,30))
  SM.savedViews.validate()

SM.savedViews.filterUsers = (str) ->
  str = str.toUpperCase()
  allUsers = $('#sv-sharing-tab .sv-share-allusers-list .sv-share-user')
  allUsers.removeClass('unmatched')
  $('#sv-sharing-tab .sv-share-none-found').hide()
  if !str || str.length==0
    $('#sv-remove-search').hide()
    $('#sv-sharing-tab .sv-share-allusers-list .sv-share-site').removeClass('unmatched')
  else
    $('#sv-remove-search').show()
    $('#sv-sharing-tab .sv-share-allusers-list .sv-share-site').addClass('unmatched')

    found = 0
    $.each allUsers, (key, usr) ->
      obj = $(usr)
      nm = $('span',obj).html().trim().toUpperCase()
      if nm.indexOf(str)==-1
        obj.addClass('unmatched')
      else
        found += 1
        obj.closest('.sv-share-site').removeClass('unmatched')
    if found == 0
      $('#sv-sharing-tab .sv-share-none-found').show()

SM.savedViews.toggleScheduled = (id, scheduled, elm) ->

  if scheduled
    SM.savedViews.addToArray(id, SM.savedViews.scheduled_users)
    $('input[id*=scheduled]',elm).prop('checked', true)
  else
    SM.savedViews.scheduled_users = SM.savedViews.scheduled_users.filter (e) -> e != id
    $('input[id*=scheduled]',elm).prop('checked', false)

  SM.savedViews.updateSharingFields()
  SM.savedViews.displaySharing()

SM.savedViews.initSharing = ->
  SM.savedViews.shared = false
  SM.savedViews.shared = true if $('#sv-shared-form').hasClass('shared')

  SM.savedViews.shared_users = $('#saved_view_shared_users').val().split(',')
  SM.savedViews.scheduled_users = $('#saved_view_scheduled_users').val().split(',')
  SM.savedViews.shared_users = [] if SM.savedViews.shared_users.length==1 && SM.savedViews.shared_users[0]==""
  SM.savedViews.scheduled_users = [] if SM.savedViews.scheduled_users.length==1 && SM.savedViews.scheduled_users[0]==""

  SM.savedViews.displaySharing()

SM.savedViews.toggleUser = (redraw, id, checked, elm) ->
  if checked
    SM.savedViews.addToArray(id, SM.savedViews.shared_users)
    elm.closest('div').addClass('checked')
  else
    SM.savedViews.shared_users = SM.savedViews.shared_users.filter (e) -> e != id
    SM.savedViews.scheduled_users = SM.savedViews.scheduled_users.filter (e) -> e != id
    elm.closest('div').removeClass('checked')
    $('> label input',elm.closest('.sv-share-site')).prop('checked', false)

  SM.savedViews.updateSharingFields()
  if redraw
    SM.savedViews.displaySharingAfterPause()


SM.savedViews.updateSharingFields = ->
  $('#saved_view_shared_users').val(SM.savedViews.shared_users.join(','))
  $('#saved_view_scheduled_users').val(SM.savedViews.scheduled_users.join(','))

SM.savedViews.addToArray = (id, arr) ->
  if arr.indexOf(id)==-1
    arr.push(id)


SM.savedViews.toggleSite = (redraw, id, checked, elm) ->
  siteUsers = $('.sv-share-user input',elm.closest('.sv-share-site'))
  if !checked
    elm.prop('checked', false)

  $.each siteUsers, (key, usr) ->
    obj = $(usr)
    if obj.prop('checked')!=checked
      obj.prop('checked', checked)
      SM.savedViews.toggleUser(false, obj.val(), checked, obj)
  if redraw
    SM.savedViews.displaySharingAfterPause()

SM.savedViews.removeAllSharing = ->
  $.each $(".sv-share-col2 .sv-share-site input"), (key, tgt) ->
    site_id = $(tgt).val()
    SM.savedViews.toggleSite(false, site_id, false, $(tgt))
  SM.savedViews.displaySharingAfterPause()

SM.savedViews.displaySharingAfterPause = ->
  setTimeout (->
    SM.savedViews.displaySharing()
  ), 100

SM.savedViews.displaySharing = ->
  return false if SM.savedViews.shared
  # take the partial and draw it out in the selected column
  allList = $('#sv-sharing-tab .sv-share-allusers-list')
  selectedList = $('#sv-sharing-tab .sv-share-selectedusers .sv-share-list')

  $('.sv-share-user input', allList).prop('checked', false)
  $('.sv-share-user.checked', allList).removeClass('checked')
  $('.sv-share-site.checked', allList).removeClass('checked')

  selectedUsers = SM.savedViews.shared_users
  SM.savedViews.numSharedWith = selectedUsers.length

  SM.savedViews.numInternalRecipients = 0

  $.each selectedUsers, (key, user_id) ->
    scheduled = SM.savedViews.scheduled_users.indexOf(user_id)!=-1
    inp = $('.sv-share-user input[value=' + user_id + ']', allList)
    inp.prop('checked', true)
    inp.closest('div').addClass('checked')
    if scheduled
      inp.closest('div').addClass('scheduled')
      SM.savedViews.numInternalRecipients += 1
    else
      inp.closest('div').removeClass('scheduled')
    inp.closest('.sv-share-site').addClass('checked')

  lbl = 'Not shared with other users'
  if SM.savedViews.numSharedWith > 0
    lbl = 'Shared with ' + SM.pluralise(SM.savedViews.numSharedWith,'other user')
    $('#sv-sharing-tab a.sv-share-removeall').show()
    $('#sv-sharing-tab .sv-share-help-1').hide()
    if SM.savedViews.numInternalRecipients > 0
      $('#sv-sharing-tab .sv-share-help-2').hide()
    else
      $('#sv-sharing-tab .sv-share-help-2').show()
  else
    $('#sv-sharing-tab a.sv-share-removeall').hide()
    $('#sv-sharing-tab .sv-share-help-1').show()
    $('#sv-sharing-tab .sv-share-help-2').hide()

  $('#sv-sharing-tab .tab-header').html(lbl)
  $('.sv-share-selectedusers-header').html(lbl)

  selectedList.html(allList.html())
  SM.savedViews.scheduledReport.internalRecipientsUpdated()
  SM.savedViews.validate()

SM.savedViews.showOverlay = ->
  $('#sv-overlay').show()
  $(".tooltip").hide()

SM.savedViews.hideOverlay = ->
  $('#sv-overlay').hide()

SM.savedViews.persistDefault = (id, link) ->
  $.ajax(
    type: 'PUT'
    dataType: 'json'
    url: "/saved_views/#{id}"
    data:
      change_default: 1
      saved_search:
        default: 1
  ).done ->
    $(SM.savedViews.containerRef + " li.default").removeClass("default")
    $(link).parent().addClass("default")

SM.savedViews.persistPinned = (id, remove) ->
  $.ajax
    type: 'PUT'
    dataType: 'json'
    url: "/saved_views/#{id}"
    data:
      change_pin: 1
      saved_view:
        pinned: if not remove then SM.savedViews.pinCount++ else +!remove
    success: ->
      ico = $("#sv-index div.sv-row[data-id=#{id}] .sv-label-icon i")
      if remove
        ico.removeClass('fa-star').addClass('fa-star-o')
      else
        ico.removeClass('fa-star-o').addClass('fa-star')

SM.savedViews.delete = (id) ->
  $.ajax
    type: 'DELETE'
    dataType: 'json'
    url: "/saved_views/#{id}"
    success: ->
      SM.message.showMessage 'View deleted'
      SM.savedViews.hideEdit()
      SM.savedViews.clearSelected()
      SM.savedViews.loadIndex()
      $("#pinnedView-"+id).parent().slideUp()

SM.savedViews.validate = ->
  err = []

  if $("#sv_label").val().length < 1
    err.push 'You have not given this view a label'

  if $('#saved_view_scheduled_report_attributes_frequency_weekly').prop('checked')
    if $('.saved_view_scheduled_report_weekdays input').filter(':checked').length==0
      err.push 'Select one or more days of the week on which to run the weekly report'

  if $('#saved_view_scheduled_report_attributes_recipients').hasClass('invalid')
    err.push 'External recipients list must be a comma separated list of valid email addresses'

  if (SM.savedViews.numInternalRecipients>0) && $('#saved_view_scheduled_report_attributes_frequency_').prop('checked')
    err.push 'You have selected some SalesMaster recipients but have not scheduled an email'

  if err.length
    SM.savedViews.showError(err[0])
  else
    SM.savedViews.hideError()
  !err.length

SM.savedViews.showError = (msg) ->
  $('#sv-message .sv-err').html(msg)
  $('#sv-save-btn').addClass('disabled')

SM.savedViews.hideError = ->
  $('#sv-message .sv-err').html('')
  $('#sv-save-btn').removeClass('disabled')

# Add a search tab to the search tabs list
SM.savedViews.addTab = (data, locked) ->
  # Set the pin count to this pinned number
  SM.savedViews.pinCount += 1 if data.pinned

  locked = true if data.id != data.ref

  # Highlight if it's already there
  if $('#pinnedView-' + data.ref).length
    $('#pinnedView-' + data.ref).hide()
    # update name in case it's changed!
    $('#pinnedView-' + data.ref + " span").text(data.label)
    $('#pinnedView-' + data.ref).slideDown()

  else
    # Make sure the tab group is visible
    $('#pinned-view-tabs').removeClass 'hide'

    t_str = '<li><a href="{{= url }}" class="search" '
    t_str += 'id="pinnedView-{{= ref }}" data-sort="{{= pinned }}">'
    t_str += '{{ if (closable) { }}<button class="close">&times;</button>{{ } else { }}'
    t_str += '<i class="icon-lock"></i>{{ } }}<span>{{= label }}</span></a></li>'
    tmpl = _.template t_str
    tab = tmpl(
      id: data.id
      ref: data.ref
      url: data.url
      label: SM.htmlEncode(data.label)
      pinned: data.pinned
      closable: !locked
    )

    # Reveal the new tab
    $(tab).appendTo('#pinned-view-list')

# You give me JSON, I give you search tabs
SM.savedViews.redrawTabs = (views, ctrlr, locked) ->
  # Filter to searches for this controller that are pinned
  $('#pinned-view-list').html('')

  if views.length
    SM.savedViews.addDefaultTab ctrlr

    # Add the tabs to the interface
    _.each views, (view) ->
      SM.savedViews.addTab view.user_view, locked

  SM.savedViews.preSelectTab()

SM.savedViews.buildTabs = ->
  if SM.currentUser && SM.currentUser.pinnedViews
    SM.savedViews.redrawTabs SM.currentUser.pinnedViews, SM.savedViews.controller

# Add a default pinned search tab
SM.savedViews.addDefaultTab = (controller) ->
  # Try to use the set default
  defaultTab = SM.currentUser.defaultView.user_view

  # Failing that, just blank all the search criteria
  defaultTab ||= criteria: "columns=&options=&search=&sort=&group_by=&sort_by=", ctrlr: controller, label: "Default"

  # Add it to the interface, locked
  SM.savedViews.addTab defaultTab, true

SM.savedViews.clearForm = ->
  $('#columns, #sort, #sort_by, #options, #sub_search, #group_by', SM.savedViews.searchForm).val ''
  $('#sub-search-results').addClass 'hide'
  SM.savedViews.resetTabs()
  SM.columnChooser.update()
  # Fire search
  SM.manualSearchUpdate()
  SM.vehicles.displayVehicleOptions false

SM.savedViews.resetTabs = ->
  $('#pinned-view-list li').removeClass 'active'

# Replaces a single string token Id with a its display name
SM.savedViews.tokenNames = (str, ctrlr) ->
  ctrlr = 'vehicles' if ctrlr == 'diary'
  if SM[ctrlr] == undefined
    ctrlr = ctrlr.substr(0, 1).toUpperCase() + ctrlr.substr(1) + 'Index'
  i = 0
  # check full token matches
  while i < SM[ctrlr].tokens.length
    if str is SM[ctrlr].tokens[i].id
      return SM[ctrlr].tokens[i].name
    i++

  # check column name matches
  formatted = SM.savedViews.checkAgainstColumns(str)
  return formatted

SM.savedViews.tokenSplit = (str) ->
  if str
    obj = { name: '', operator: '', value: '' }
    operators = [':','<','>']
    if (str[0] == '(')
      str = str.substr(1)
    if (str[str.length-1] == ')')
      str = str.substr(0,str.length-1)
    for o in operators
      arr = str.split(o)
      if arr[1]
        obj.operator = o
        obj.name = arr[0]
        obj.value = arr[1]
        return obj
  else
    str
  return undefined

SM.savedViews.checkAgainstColumns = (str) ->
  token = SM.savedViews.tokenSplit(str)
  if token
    token.value = token.value.split(",").join(", ")
    token.value = token.value.split("_").join(" ")
    i = 0
    while i < SM.columns.length
      if token.name is SM.columns[i][0]
        token.name = SM.columns[i][1]
        return token.name + token.operator + token.value
      i++
    str = token.name + token.operator + token.value
  str

# Replaces all token Ids with their display name in a string
SM.savedViews.textToNames = (wordStr, ctrlr) ->
  words = decodeURI(wordStr).split ' '
  replaced = []
  for word in words
    replaced.push SM.savedViews.tokenNames word, ctrlr
  replaced.join ' '

# Returns a string of labels from a string of space separated words
# Anything after the first comma is ignored
SM.savedViews.labelise = (text, ctrlr) ->
  searchAndSort = text.split ','
  words = searchAndSort[0].split ' '
  tokens = []
  for word in words
    tokens.push '<span class="label label-info">' + SM.savedViews.tokenNames(word, ctrlr) + '</span>'
  [tokens.join ' ', searchAndSort[1]].join ' '

SM.savedViews.availableExports = ->
  _.filter ['pdf', 'xls', 'csv'], (filetype) ->
    $ ".dropdown-menu.downloads #export-#{filetype}"
      .length > 0
