
SM.Calendar.Container.API =

  defaults:
    search: ""

  _ajaxCall: undefined

  _filter: undefined
  _page: 1
  _loaded: 0
  _total: undefined

  setFilter: (filter) ->
    @_filter = filter

  loadPage: (page) ->

    @_page = page
    filter = @_filter

    if @_page > 1
      filter.page = @_page
    else
      @_loaded = 0

    @abortLoad()

    @_ajaxCall = $.ajax(
      type: 'GET'
      url: "/timeline_events/",
      data: filter,
      global: false,
      dataType: 'json'
    ).done( (data, textStatus, request) =>

      @_total = request.getResponseHeader('X-Total')

      SM.Calendar.Container.Store.eventsLoaded(data["timeline_events"])

      @_loaded += data["timeline_events"].length

      if @_loaded < @_total
        @loadPage(@_page + 1)
    )
    SM.Calendar.Container.showLoader()

  abortLoad: ->
    @_ajaxCall.abort() if @_ajaxCall


SM.Calendar.Container.Store =

  _events: []

  _cells: []

  _numSlots: 50

  _user: undefined

  _modes: [
    { id: 0, lbl: "Hr",   unit: 15, unit_type: 'minutes', slots_to_show: 50,  num_units: 4    }
    { id: 1, lbl: "Day",  unit: 60, unit_type: 'minutes', slots_to_show: 50,  num_units: 12, start_mins: 480 }
    { id: 2, lbl: "Wk",   unit: 1,  unit_type: 'days',    slots_to_show: 50,  num_units: 7    }
    { id: 3, lbl: "Mth",  unit: 1,  unit_type: 'days',    slots_to_show: 4,   num_units: 42   }
    { id: 4, lbl: "Qtr",  unit: 1,  unit_type: 'days',    slots_to_show: 10,  num_units: 42*3 }
  ]
  _selectedMode: null
  _selectedDate: moment().startOf('day')
  _startDate: moment().startOf('day')
  _endDate: moment().startOf('day')

  _dragEvent: undefined

  init: ->
    SM.Calendar.Form.init()

    @_selectedMode = @_modes[2]

  getCells: -> @_cells

  getEvents: -> @_events

  getNumSlots: -> @_numSlots

  getModes: -> @_modes

  getSelectedMode: -> @_selectedMode

  getSelectedDate: -> @_selectedDate

  getStartDate: -> @_startDate

  getEndDate: -> @_endDate

  count: -> @_events.length

  addChangeListener: (callback) -> $(@).bind 'change', callback

  removeChangeListener: (callback) -> $(@).unbind 'change', callback

  beginningOfWeek: ->
    if SM.currentAccount.settings.beginning_of_week
      SM.app.weekdays.indexOf(SM.currentAccount.settings.beginning_of_week.titleize())
    else
      0

  getCell: (dt) ->
    for c in @_cells
      if dt.isSame(c.start)
        return c
    return undefined

  clearEvents: ->
    @_events = []

  addEvents: (data) ->
    @_events << data
    @parseEventsDates(data)
    @addEventsToCells(data)
    @didUpdate()

  getUser: ->
    @_user

  setUser: (id) ->
    @_user = id
    @refresh()

  getEventsForDate: (start) ->

    if @_selectedMode.id == 1
      end = start.clone().add({hours:1})
    else
      end = start.clone().add({days:1})

    arr = []
    for e in @_events
      if e.end_at < start or e.start_at > end
        # out of range
      else
        arr.push(e)
    arr

  getEventById: (id) ->
    for e in @_events
      return e if e.id == id

  refresh: ->
    @setSelectedMode(@_selectedMode.id)

  setSelectedMode: (id) ->
    SM.Calendar.Container.Drag.clearDrag()

    @_selectedMode = @_modes[id]
    @setDateRange()
    @didUpdate()

  setSelectedDate: (dt) ->
    @_selectedDate = moment(dt)

    @setDateRange()
    @didUpdate()

  gotoDate: (dt) ->
    if @_selectedMode.id>2
      @_selectedMode = @_modes[2]
    else if @_selectedMode.id==2
      @_selectedMode = @_modes[1]
    else if @_selectedMode.id==1
      @_selectedMode = @_modes[0]

    @setSelectedDate(dt)

  moveSelectedDate: (dir) ->
    if dir == "0"
      new_dt = moment().startOf('day')
    else
      new_dt = @_selectedDate.clone()
      if @_selectedMode.id == 0
        new_dt.add hours: Number(dir)
      if @_selectedMode.id == 1
        new_dt.add days: Number(dir)
      else if @_selectedMode.id == 2
        new_dt.add weeks: Number(dir)
      else if @_selectedMode.id == 3
        new_dt.add months: Number(dir)
      else if @_selectedMode.id == 4
        new_dt.add months: Number(dir) * 3
      else if @_selectedMode.id == 5
        new_dt.add years: Number(dir)
    @setSelectedDate(new_dt)

  daysSinceBeginningOfWeek: (dt) ->
    if dt
      last_mon = dt.clone().startOf('week')
      dys = (dt - last_mon)/3600/24/1000
      Math.round(dys % 7)

  setDateRange: ->
    startDate = @_selectedDate.clone()
    if @_selectedMode.id<=1
      endDate = startDate.clone().add({days: 1})
    if @_selectedMode.id==2
      startDate.startOf('week') if startDate.day() != 0
      endDate = startDate.clone().add({days: 7})
    if @_selectedMode.id==3
      startDate.startOf('month')
      endDate = startDate.clone().add({months: 1, days: -1})
    if @_selectedMode.id==4
      startDate.startOf('month').subtract(1, 'month')
      endDate = startDate.clone().add({months: 3, days: -1})
    if @_selectedMode.id==5
      startDate.startOf('year') if startDate.month() != 0
      startDate.startOf('month')
      endDate = startDate.clone().add({years: 1, days: -1})

    @_startDate = startDate
    @_endDate = endDate

    @updateEvents()

  createCells: ->
    arr = []
    o = @_startDate

    if @_selectedMode.id>0
      o.hours(0)
      o.minutes(0)

    d = o.clone()
    d.add({minutes:@_selectedMode.start_mins}) if @_selectedMode.start_mins
    e = @_endDate

    offset = {}
    offset[@_selectedMode.unit_type] = @_selectedMode.unit

    i=0
    while d <= e && i < @_selectedMode.num_units
      slotArray = new Array(@getNumSlots() + 1).join('-').split('')
      arr.push
        i: arr.length,
        start: d.clone(),
        end: d.clone().add(offset),
        events: [],
        slots: slotArray

      d.add(offset)
      i++

    @_cells = arr

  updateEvents: ->
    return if !@_user
    @createCells()
    filter =
      search: "user_id:#{@_user}+AND+end_at>#{@_startDate.clone().add({ days: -1 }).format('DD_MMM_YYYY')}+AND+start_at<#{@_endDate.format('DD_MMM_YYYY')}"
    SM.Calendar.Container.API.setFilter(filter)
    SM.Calendar.Container.API.loadPage(1)

  eventsLoaded: (events) ->
    SM.Calendar.Container.Store.addEvents(events)
    @didUpdate()
    SM.Calendar.Container.hideLoader()

  getCellsOfEvent: (evt) ->
    arr = []
    for c in @_cells
      if evt.end_at <= c.start or evt.start_at >= c.end
        # out of range
      else
        arr.push(c)
        c.events.push(evt)
    arr

  parseEventsDates: (events) ->
    for e in events
      e.start_at = moment(e.start_at)
      e.end_at = moment(e.end_at)

  addEventsToCells: (events) ->
    for e in events
      cells = @getCellsOfEvent(e)
      slot = @getFirstAvailableSlot(cells)
      @addEventToCellSlots(e,cells,slot)

  getFirstAvailableSlot: (cells) ->
    s = 0
    while s < 100
      free = true
      for c in cells
        if c.slots[s]!='-'
          free = false
          break
      if free
        return s
      s+=1
    return undefined

  addEventToCellSlots: (event, cells, slot) ->
    c = 0
    while c < cells.length
      cells[c].slots[slot] = {event: event, pos: c, len: cells.length}
      c++

  didUpdate: ->
    $(@).trigger 'change'


SM.Calendar.Container.Drag  =
  _dragEvent: undefined
  _dragStarted: false
  _dragMoved: false
  _dragStartUnit: undefined
  _dragEndUnit: undefined

  isDragging: ->
    @_dragMoved

  startDrag: (t) ->
    @_dragEvent = t
    evt = $(t.target).closest("div.cal-event")
    return if evt.length
    @clearDrag()
    @_dragStarted = true

  doDrag: (t) ->
    if @_dragStarted
      tgt = @getClosestUnit(t)

      if tgt.length
        @_dragMoved = true
        i = Number(tgt.data("i"))

        if @_dragStartUnit==undefined
          @_dragStartUnit = i
        else
          @_dragEndUnit = i
        @highlightDraggedUnits()

  endDrag: (t) ->
    t = @_dragEvent if !t
    if @_dragStarted && @_dragMoved
      if @_dragStartUnit > @_dragEndUnit
        tmp = @_dragStartUnit
        @_dragStartUnit = @_dragEndUnit
        @_dragEndUnit = tmp

      st = SM.Calendar.Container.Store.getCells()[@_dragStartUnit].start.clone()
      en = SM.Calendar.Container.Store.getCells()[@_dragEndUnit].end.clone()

      @_dragStarted = false
      @_dragMoved = false

      if en.format("HH:mm:ss") == "00:00:00"
        en.add({minutes:-1})
      SM.Calendar.Form.newEvent
        start_at: st.toDate()
        end_at: en.toDate()
        all_day: SM.Calendar.Container.Store.getSelectedMode().id>=2
        user_id: SM.Calendar.Container.Store.getUser()
        created_by: SM.currentUser.id
    else if @_dragStarted
      tgt = @getClosestUnit(t)
      st = SM.Calendar.Container.Store.getCells()[tgt.data('i')].start.clone()
      SM.Calendar.Container.Store.gotoDate(st)
      @clearDrag()

  getClosestUnit: (t) ->
    if SM.ios
      latestTouchedElm = document.elementFromPoint(t.clientX, t.clientY);
      tgt = $(latestTouchedElm).closest("div.cal-unit")
    else
      tgt = $(t.target).closest("div.cal-unit")
    tgt

  clearDrag: ->
    @_dragStarted = false
    @_dragMoved = false
    @_dragStartUnit = undefined
    @_dragEndUnit = undefined
    @highlightDraggedUnits()

  highlightDraggedUnits: ->
    first = Math.min.apply(Math, [@_dragStartUnit,@_dragEndUnit])
    last  = Math.max.apply(Math, [@_dragStartUnit,@_dragEndUnit])
    $("#calendar .cal-unit.highlight").removeClass("highlight")
    c = first
    while c <= last
      $("#calendar .cal-unit[data-i="+c+"]").addClass("highlight")
      c++

SM.Calendar.Container.View = React.createClass
  getDefaultProps: ->

  getStateFromStore: ->
    selectedMode: SM.Calendar.Container.Store.getSelectedMode()
    selectedDate: SM.Calendar.Container.Store.getSelectedDate()
    startDate:    SM.Calendar.Container.Store.getStartDate()
    endDate:      SM.Calendar.Container.Store.getEndDate()
    modes:        SM.Calendar.Container.Store.getModes()
    cells:        SM.Calendar.Container.Store.getCells()

  getInitialState: ->
    this.getStateFromStore()

  componentDidMount: ->
    SM.Calendar.Container.Store.addChangeListener(this._onChange);
    this.addBindings()

  componentWillUnmount: ->
    SM.Calendar.Container.Store.removeChangeListener(this._onChange);

  _onChange: ->
    this.setState(this.getStateFromStore())

  highlightEvent: (id, state) ->
    if state
      $("#calendar div.cal-event[data-id=" + id + "]").addClass("hover")
    else
      $("#calendar div.cal-event[data-id=" + id + "]").removeClass("hover")

  addBindings: ->
    $("#calendar").on "mouseover", "div.cal-day", (e) =>
      tgt = $(e.target).closest("div.cal-day")
      tgt.addClass("hover")

    $("#calendar").on "mouseout", "div.cal-day", (e) =>
      tgt = $(e.target).closest("div.cal-day")
      tgt.removeClass("hover")

    $("#calendar").on "mouseover touchstart", "div.cal-event", (e) =>
      e.stopPropagation()
      if SM.Calendar.Container.Store.getSelectedMode().id <= 3
        tgt = $(e.target).closest("div.cal-event")
        @highlightEvent(tgt.data("id"), true)

    $("#calendar").on "mouseout touchend", "div.cal-event", (e) =>
      e.stopPropagation()
      if SM.Calendar.Container.Store.getSelectedMode().id <= 3
        tgt = $(e.target).closest("div.cal-event")
        @highlightEvent(tgt.data("id"), false)

    $("#calendar").on "mousedown touchstart", "div.cal-grid", (e) =>
      e.preventDefault()
      t = SM.getTouchEvent(e)
      SM.Calendar.Container.Drag.startDrag(t)

    $("#calendar").on "mousemove touchmove", "div.cal-grid", (e) =>
      e.preventDefault()
      t = SM.getTouchEvent(e)
      SM.Calendar.Container.Drag.doDrag(t)

    $("#calendar").on "mouseup touchend", "div.cal-grid", (e) =>
      e.preventDefault()
      t = SM.getTouchEvent(e)
      SM.Calendar.Container.Drag.endDrag(t)

  render: ->
    React.createElement 'div', { className: 'cal-top' }, React.createElement('div', { className: 'cal-header' }, React.createElement(SM.Calendar.Navigation.View,
      modes: @state.modes
      selectedDate: @state.selectedDate
      selectedMode: @state.selectedMode)), React.createElement(SM.Calendar.Grid.View,
      cells: @state.cells
      selectedMode: @state.selectedMode
      selectedDate: @state.selectedDate
      startDate: @state.startDate
      endDate: @state.endDate)

SM.Calendar.Container.buildLoader = ->
  opts =
    lines: 13 # The number of lines to draw
    length: 4 # The length of each line
    width: 2 # The line thickness
    radius: 6 # The radius of the inner circle
    corners: 1 # Corner roundness (0..1)
    rotate: 0 # The rotation offset
    direction: 1 # 1: clockwise, -1: counterclockwise
    color: "#000" # #rgb or #rrggbb or array of colors
    speed: 2.1 # Rounds per second
    trail: 60 # Afterglow percentage
    shadow: false # Whether to render a shadow
    hwaccel: true # Whether to use hardware acceleration
    className: "spinner" # The CSS class to assign to the spinner
    zIndex: 999999 # The z-index (defaults to 2000000000)
    top: "50%" # Top position relative to parent
    left: "50%" # Left position relative to parent

  SM.Calendar.Container.loader = new Spinner(opts).spin(document.getElementById("cal-loader"))
  $("#cal-loader").fadeOut(0)


SM.Calendar.Container.showLoader = ->
  $("#cal-loader").fadeIn(300)

  clearTimeout SM.Calendar.Container.loaderTimeout
  SM.Calendar.Container.loaderTimeout = setTimeout(=>
    SM.Calendar.Container.hideLoader()
    return
  , 20000)

SM.Calendar.Container.hideLoader = ->
  clearTimeout SM.Calendar.Container.loaderTimeout
  $("#cal-loader").fadeOut(300)

