
SM.Calendar = {}
SM.Calendar.Container = {}
SM.Calendar.Navigation = {}
SM.Calendar.Grid = {}
SM.Calendar.Form = {}
SM.Calendar.open = false

SM.Calendar.init = ->
  setTimeout(SM.Calendar.Container.Store.init(),2000)

  React.render(
    React.createElement SM.Calendar.Container.View, null
    document.getElementById('calendar')
  )

SM.Calendar.show = ->
  $.fancybox
    content: "<div id='calendar'></div>"
    centerOnScroll: true
    autoSize: false
    closeBtn: false
    wrapCSS: 'sm-calendar'
    titleShow: false
    openEffect: 'none'
    closeEffect: 'none'
    overlayColor: '#fff'
    width: $(document).width() - 50
    height: $(document).height() - 50
    beforeShow: ->
    afterShow: ->
      SM.Calendar.init()
      SM.Calendar.open = true
      $(document.body).addClass("calendar-mode")
    afterClose: ->

SM.Calendar.hide = ->
  SM.Calendar.Container.API.abortLoad()
  $('#timeline_event_form').modal('hide')
  $.fancybox.close()
  SM.Calendar.open = false
  $(document.body).removeClass("calendar-mode")
  SM.Calendar.Container.hideLoader()

SM.Calendar.editEvent = (event_id) ->
  if event_id
    # edit
    $.getJSON "/timeline_events/#{event_id}", (data) ->
      evt = data['timeline_event']
      evt.start_at = Date.parse evt.start_at
      evt.end_at = Date.parse evt.end_at
      SM.timeline.display_form_if_you_have_access evt
  else
    # new
    SM.timeline.showForm user_id: SM.currentUser.id, created_by: SM.currentUser.id

