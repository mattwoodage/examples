class SM.diary.LogisticsCapacityByCenter extends SM.diary.LogisticsCapacity

  modalClass: 'by-center'
  submitBtn: undefined

  bind: =>
    super
    _this = this

    $(document.body).on 'click', '#logistics-popover .multi_click', (event) ->
      id = $(this).val()
      $('#' + id + '.destroy').val !@checked
      return

    $(document.body).on 'click', '#logistics-popover a.submit', (event) ->
      event.preventDefault()
      _this.toggleDateSetting()
      return

  showModal: =>
    super
    @submitBtn = $('a.submit', @modal())

  modalForm: ->
    _this = this
    html = '<h3>Logistics to Capacity</h3>'
    $.each @diary.logistic_centers, (a, center) ->
      checked = if _this.atCapacity(center.site_id) then 'checked' else ''
      inp = "<input type='checkbox' #{checked} value='#{center.site_id}' class='multi_click'>"
      html += "<label class='checkbox'>#{inp}#{center.name}</label>"
      html += "<input type='hidden' value='false' id='#{center.site_id}' class='destroy'>"
    html += '<div class=\'btn-group pull-right\'><a href=\'#\' class=\'btn btn-small btn-primary submit\'>Save</a></div>'

  submitUpdates: ->
    @submitBtn.html('Saving...').attr('disabled','disabled')
    super

  allUpdatesComplete: ->
    @submitBtn.html('Saved')
    super

  atCapacity: (site_id) ->
    @capacityArr[site_id]
