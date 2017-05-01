class SM.diary.LogisticsCapacity

  dateString: undefined
  dateElement: undefined
  capacityArr: []
  modalClass: ''
  pendingUpdates: 0
  errors: []
  modal: -> $('#logistics-popover')

  constructor: (@diary = SM.diary) ->
    @bind()

  bind: =>
    _this = this
    ref = 'div.diary-header span.D a, div.diary-header a.diary-header-daylabel'

    $(@diary.settings.container).on SM.events.dblclick, ref, (event) ->
      event.preventDefault()
      _this.dateSelected $(this)

    $(@diary.settings.container).on SM.events.click, ref, (event) ->
      event.preventDefault()

  dateInit: ->
    @pendingUpdates = 0
    @errors = []
    @capacityArr = @diary.restrictionsManager.capacityPerSite(Date.parse(@dateString))
    @showModal()

  dateSelected: (el) ->
    @dateElement = el
    @dateString = el.data("date")
    @dateInit()

  modalContent: ->
    "<div class='lcl-container' data-date='#{@dateString}' class='row-fluid'>#{@modalForm()}</div>"

  modalForm: ->
    ''

  showModal: ->
    arr = '<div class=\'arrow\'></div>'
    inner = '<div class=\'popover-inner\'><h3 class=\'popover-title\'></h3><div class=\'popover-content\'><div></div></div></div>'

    settings =
      el: @dateElement
      heading: 'Date Settings'
      content: @modalContent()
      trigger: 'manual'
      animation: false
      template: "<div id='logistics-popover' class='popover #{@modalClass}'>#{arr}#{inner}</div>"
      placement: 'bottom'
      title: "#{@dateString}<a class='close' href='#'>&times;</a><b></b>"
    $('body div.popover').remove()
    settings.el.popover settings
    settings.el.popover 'show'

  toggleDateSetting: =>
    creating = true

    dt = Date.parse(@dateString)

    _url = '/accounts/' + @diary.settings.account_id + '/'
    _data = []
    _sites = []
    _data.push 'start_at=' + encodeURIComponent(@diary.formatDateForSaving(dt))
    end_dt = dt.add(1).day().add(-1).seconds().clone()
    _data.push 'end_at=' + encodeURIComponent(@diary.formatDateForSaving(end_dt))
    _data.push 'date_type=nomovement'
    multi_center = @diary.logistic_centers.length > 0
    checked_arr = $('input:checked', @modal())
    url_prefix = @urlPrefix(checked_arr.size(), multi_center)

    if multi_center
      # send all the ones to add
      @logisticToCapacityParse checked_arr, _data, _url + url_prefix
    else
      @submitUpdates _url + url_prefix, _data, true

    # Use filter as IE8 can't select inputs by value correctly
    deleted_arr = $('input.destroy', @modal()).filter(->
      @value == 'true'
    )

    if deleted_arr.length > 0
      # send all the ones to remove
      @logisticToCapacityParse deleted_arr, _data, _url + 'destroy_date'

  urlPrefix: (checked_size, multi_center) ->
    url_prefix = ''
    if checked_size > 0
      url_prefix = 'create_date'
    else if !multi_center
      url_prefix = 'destroy_date'
    url_prefix

  logisticToCapacityParse: (inputs_array, data, _url) ->
    _this = this
    total = inputs_array.length
    $.each inputs_array, (i, center) ->
      site_id = if center.id == '' then center.value else center.id
      data.push 'site_id=' + site_id
      _this.submitUpdates _url, data
      return
    return

  submitUpdates: (_url, _data) ->
    _this = this
    @pendingUpdates += 1
    @resetErrors()
    $.ajax(
      url: _url
      type: 'POST'
      dataType: 'json'
      data: _data.join('&')
    ).done((data, textStatus, jqXHR) ->
      _this.updateSuccessful()
    ).fail (data, textStatus, jqXHR) ->
      _this.updateFailed(data)
    return

  updateSuccessful: ->
    @updateComplete()

  updateFailed: (data) ->
    @errors = JSON.parse(data).errors
    @updateComplete()

  updateComplete: ->
    @pendingUpdates -= 1
    if @pendingUpdates == 0 then @allUpdatesComplete()

  allUpdatesComplete: ->
    if @errors.length
      @submitBtn.html('Save').removeAttr('disabled')
      @showErrors()
    else
      @submitBtn.html('Saved')
      @reload()

  reload: ->
    _this = this
    setTimeout (->
      _this.modal().remove()
      _this.diary.reload()
      return
    ), 1000

  showErrors: ->
    $('.lcl-msg', @modal()).hide()
    $('.lcl-err', @modal()).html(@errors.join(", ")).show()

  resetErrors: ->
    @errors = []
    $('.lcl-msg', @modal()).show()
    $('.lcl-err', @modal()).html('').hide()
