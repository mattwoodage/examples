class SM.diary.LogisticsCapacityByAccount extends SM.diary.LogisticsCapacity

  modalClass: 'by-account'

  bind: =>
    super
    _this = this

    $(document.body).on 'change', '#logistics-popover .one_click input', (event) ->
      _this.toggleDateSetting()

  modalForm: ->
    checked = if @atCapacity() then 'checked' else ''
    "<label class='checkbox one_click'><input type='checkbox' #{checked}>Logistics to capacity</label>"

  atCapacity: ->
    @capacityArr[0]

  allUpdatesComplete: ->
    if @errors.length
      @showErrors()
    else
      @reload()
