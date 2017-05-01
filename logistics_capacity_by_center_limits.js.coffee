class SM.diary.LogisticsCapacityByCenterLimits extends SM.diary.LogisticsCapacity
  modalClass: 'with-limits'
  siteId: undefined
  data: undefined
  periods: ['am','pm']
  fields: ['hours','vehicles','instructors']
  defaultLimit: undefined
  dailyLimit: undefined
  submitBtn: undefined
  editDefaults: false
  startAt: undefined
  endAt: undefined
  action: undefined

  bind: ->
    super
    _this = this
    $(document).on SM.events.click, '#logistics-centers a', (event) ->
      event.preventDefault()
      SM.diary.logisticsCapacity.loadCapacitiesForSite($(this))

    $(document).on 'change', '#logistics-popover input', (event) ->
      event.preventDefault()
      _this.updateTotals()

    $(document).on SM.events.click, '#lcl-default-details', (event) ->
      _this.toggleDefaults $('#lcl-default-details').hasClass('active')

    $(document).on SM.events.click, '#logistics-popover a.set-defaults', (event) ->
      event.preventDefault()
      _this.setValuesToDefaults()

    $(document).on 'submit', '#lcl-form', ->
      _this.submitUpdates()

    $(document).on 'ajax:success', '#lcl-form', ->
      _this.updateSuccessful()

    $(document).on 'ajax:error', '#lcl-form', (data, response) ->
      _this.updateFailed(response.responseText)

  modalForm: ->
    html = '<h3>Select a logistics centre</h3><ul id=\'logistics-centers\'>'
    $.each @diary.logistic_centers, (a, center) ->
      html += "<li><a href='#' data-id='#{center.site_id}'>#{center.name}</a></li>"
    html

  loadCapacitiesForSite: (elm) ->
    _this = this
    @siteId = elm.data('id')
    $(".popover-title b",@modal()).append(elm.html())
    $(".lcl-container",@modal()).html("<div class='lcl-loading'>Loading...</div>")
    @data = []
    dt = Date.parse(_this.dateElement.data("date"))

    @data.push "site_id=#{@siteId}"
    @data.push "start_at=#{encodeURIComponent(@diary.formatDateForSaving(dt))}"
    end_dt = dt.add(1).day().add(-1).seconds().clone()
    @data.push "end_at=#{encodeURIComponent(@diary.formatDateForSaving(end_dt))}"

    url = "/accounts/#{@diary.settings.account_id}/logistics_capacity_limits/"
    $.ajax(
      url: url
      type: 'POST'
      dataType: 'json'
      data: @data.join('&')
    ).done (data) ->
      _this.buildCapacitiesForm data
      return

  buildCapacitiesForm: (data) ->
    _this = this
    url = @buildUrl(data)
    $.ajax(
      url: url
      type: 'GET'
    ).done (html) ->
      _this.initForm(html)
      return
    return

  buildUrl: (data) ->
    @defaultLimit = undefined
    @dailyLimit = undefined
    params = ["lo=modal"]
    url = "/logistics_capacity_limits/"
    if data
      for d in data.limits
        if d.logistics_capacity_limit.daily
          @dailyLimit = d.logistics_capacity_limit
        else
          @defaultLimit = d.logistics_capacity_limit

    if @defaultLimit then params.push("default=#{@defaultLimit.id}")

    if @dailyLimit
      url += "#{@dailyLimit.id}/edit"
    else
      url += "new"

    url += "?#{@data.concat(params).join("&")}"
    return url

  initForm: (html) ->
    $(".lcl-container",@modal()).html(html)
    @submitBtn = $('button.submit', @modal())

    if @defaultLimit
      $(".lcl-msg, .lcl-default", @modal()).removeClass("hidden")
    else
      $(".lcl-msg, .lcl-default", @modal()).addClass("hidden")

    @startAt = $("#logistics_capacity_limit_start_at").val()
    @endAt = $("#logistics_capacity_limit_end_at").val()
    @action = $("form",@modal()).prop("action")

    @updateTotals()

  updateTotals: ->
    forms = ['#lcl-default-details', '#lcl-details']
    for form in forms
      for period in @periods
        hrs = Number($("#{form} #logistics_capacity_limit_#{period}_hours").val())
        veh = Number($("#{form} #logistics_capacity_limit_#{period}_vehicles").val())
        ins = Number($("#{form} #logistics_capacity_limit_#{period}_instructors").val())
        $("#{form} #lcl-#{period}-concurrent .lcl-total").html(Math.min(veh, ins))
        $("#{form} #lcl-#{period}-total .lcl-total").html(hrs * Math.min(veh, ins))

  submitUpdates: ->
    @pendingUpdates += 1
    @submitBtn.html('Saving...').attr 'disabled', 'disabled'
    @resetErrors()

  setValuesToDefaults: ->
    for period in @periods
      for form in @fields
        elm = $("#logistics_capacity_limit_#{period}_#{form}")
        elm.val Number(elm.next().html())

    @updateTotals()

  toggleDefaults: (v) ->
    @editDefaults = v
    if @editDefaults
      @setEditDefaults()
    else
      @setEditDay()

  setEditDefaults: ->
    $(".lcl-container", @modal()).addClass 'defaults'
    @setValuesToDefaults()
    defaultEndAt = Date.parse(@endAt).add(1).year()
    $("#lcl-default-details #logistics_capacity_limit_start_at").val @startAt
    $("#lcl-default-details #logistics_capacity_limit_end_at").val @diary.formatDateForSaving(defaultEndAt)
    default_id = $('#lcl-default-details').data 'id'
    action_url = "/logistics_capacity_limits/"
    if default_id
      action_url += default_id
    $('form', @modal()).attr 'action', action_url

  setEditDay: ->
    $("#lcl-form")[0].reset()
    $(".lcl-container" ,@modal()).removeClass 'defaults'
    $("#logistics_capacity_limit_start_at").val @startAt
    $("#logistics_capacity_limit_end_at").val @endAt
    $('form',@modal()).attr 'action', @action
