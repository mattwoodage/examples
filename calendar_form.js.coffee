
SM.Calendar.Form =

  _currentEvent: undefined

  _initialised: false

  init: ->

    if !@_initialised

      $('#timeline_event_form').on 'shown', =>
        @formOpened()
        return

      $('#timeline_event_form').on 'hidden', =>
        @formClosed()
        return

      @_initialised = true

  close: ->

  editEvent: (event) ->
    # Convert Moment back to JS date for Timeline to render
    timelineEvent= $.extend true, {}, event
    timelineEvent.start_at = event.start_at.toDate()
    timelineEvent.end_at = event.end_at.toDate()
    @_currentEvent = event
    SM.timeline.display_form_if_you_have_access timelineEvent

  newEvent: (opts) ->
    SM.timeline.showForm opts

  formOpened: ->

  formClosed: ->
    SM.Calendar.Container.Drag.clearDrag()

  formSaved: ->
    SM.Calendar.Container.Store.refresh()
