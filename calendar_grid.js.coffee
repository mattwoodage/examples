
SM.Calendar.Grid.Store = {}

SM.Calendar.Grid.View = React.createClass

  dateUpdated: ->
    this.props.selectedDate = moment(this.props.selectedDate)

  render: ->
    props = this.props
    mths_diff = this.props.endDate.month() - this.props.startDate.month()
    mths_diff += 12 if mths_diff < 0
    ranges = []
    i = 0
    dt_s = this.props.startDate.clone()

    while i <= mths_diff
      dt_e = dt_s.clone().add({ months: 1 })
      ranges.push({ s: dt_s.clone() ,e: dt_e.clone() })
      dt_s.add({ months: 1 }).startOf('month')
      i++

    months = ranges.map (rng, i) =>
      c = _(props.cells).reject((x) -> x.start.month() != rng.s.month())

      React.createElement SM.Calendar.Month,
        key: i
        idx: i
        dateRange: rng
        cells: c
        selectedMode: props.selectedMode
        selectedDate: props.selectedDate
    cls = "cal-grid mode-" + props.selectedMode.id
    React.createElement 'div', { className: cls }, React.createElement('div', null, months)

SM.Calendar.Month = React.createClass

  blanks: (num) ->
    arr = []
    b=0
    while b < num
      arr.push(b)
      b++
    blnks = arr.map (a) =>
      React.createElement 'div', className: 'cal-unit cal-blank'
    return blnks

  render: ->
    props = this.props

    o = this.props.dateRange.s.clone()

    cells = []
    cells = cells.concat(new Array(1+SM.Calendar.Container.Store.daysSinceBeginningOfWeek(o)).join('B').split('')) if props.selectedMode.id > 2
    for c in props.cells
      cells.push(c)

    cells = cells.concat(new Array(43 - props.cells.length - SM.Calendar.Container.Store.daysSinceBeginningOfWeek(o)).join('B').split('')) if props.selectedMode.id > 2

    rows_str = [[],[],[],[],[],[]]
    cells_str = []
    c=0
    r=0
    idx = 0
    while (c < cells.length)

      idx += (props.idx*7) if props.selectedMode.id == 2

      if cells[c] == 'B'
        rows_str[r].push(React.createElement 'div', className: 'cal-unit cal-blank')
      else
        rows_str[r].push(React.createElement SM.Calendar.Cell,
            idx: idx
            cell: cells[c]
            selectedDate: props.selectedDate
            selectedMode: props.selectedMode
        )
        idx += 1

      r+=1 if c%7==6 && props.selectedMode.id > 1
      c+=1

    if props.selectedMode.id > 2
      rows = rows_str.map (r) =>
        React.createElement 'div', { className: 'cal-row' }, r
    else
      rows = rows_str.map (r) =>
        React.createElement 'span', null, r

    React.createElement 'div', { className: 'cal-mth' }, React.createElement(SM.Calendar.Month.Header,
      idx: props.idx
      startDate: props.dateRange.s
      selectedMode: props.selectedMode), rows

SM.Calendar.Month.Header = React.createClass
  render: ->

    if this.props.selectedMode.id <= 2 && this.props.idx > 0
      # skip header
      React.createElement 'div', null
    else
      mthLbl = this.props.startDate.format("MMMM YYYY")
      mthLbl = this.props.startDate.format("dddd Do MMMM YYYY") if this.props.selectedMode.id <= 1
      arr = SM.rotate(SM.app.weekdays, SM.Calendar.Container.Store.beginningOfWeek())
      weekDays = ""
      if this.props.selectedMode.id > 2
        weekDays = arr.map (lbl) =>
          lbl = lbl.slice(0,2) if this.props.selectedMode.id > 3
          React.createElement 'div', { className: 'cal-unit cal-wkday' }, lbl
      React.createElement 'div', null, React.createElement('div', { className: 'cal-month-label' }, mthLbl), weekDays


SM.Calendar.Cell = React.createClass

  dateLabels: (dt,arr) ->
    str = arr.map (a) ->
      cls = "cal-lbl-" + a
      React.createElement 'div', { className: cls }, dt.format(a)

    str

  eventsNotShown: ->
    e = 0
    s = this.props.selectedMode.slots_to_show
    while s < this.props.cell.slots.length
      if this.props.cell.slots[s] != '-'
        e += 1
      s+=1
    e

  render: ->
    props = this.props

    cls = ['cal-unit','cal-day']
    if props.cell.start.format("M") == props.selectedDate.format("M")
      cls.push "cal-this-month"
    else
      cls.push "cal-other-month"

    cls.push "cal-first-of-month" if props.cell.start.format('DD') == "01"

    cls.push "weekend" if props.cell.start.isoWeekday() > 6

    now = moment()

    if (now >= props.cell.start && now < props.cell.end)
      cls.push "cal-today"

    cls.push "cal-unit-" + props.idx

    lbl = ""
    if props.selectedMode.id==0
      lbl = this.dateLabels(props.cell.start,["HH:mm"])
    if props.selectedMode.id==1
      lbl = this.dateLabels(props.cell.start,["HH:mm"])
    if props.selectedMode.id==2
      lbl = this.dateLabels(props.cell.start,["ddd","DD","MMM"])
    if props.selectedMode.id==3
      lbl = this.dateLabels(props.cell.start,["DD"])
    if props.selectedMode.id==4
      lbl = this.dateLabels(props.cell.start,["DD"])
    if props.selectedMode.id==5
      lbl = this.dateLabels(props.cell.start,["DD"])

    eventData = SM.Calendar.Container.Store.getEventsForDate(props.cell.start)

    notShown = @eventsNotShown()

    count = ""
    count = "+" + notShown  if notShown > 0

    slotsToShow = props.cell.slots.slice(0,props.selectedMode.slots_to_show)
    slots = slotsToShow.map (content, i) =>
      if content == '-'
        React.createElement 'div', className: 'cal-slot'

      else
        React.createElement SM.Calendar.Event,
          idx: i
          data: content
          cell: props.cell
          cell_idx: props.idx

    React.createElement 'div', {
      ref: 'cell'
      className: cls.join(' ')
      'data-i': props.cell.i
    }, React.createElement('div', { className: 'cal-lbl' }, lbl), React.createElement('div', { className: 'cal-count' }, count), React.createElement('div', { className: 'cal-slots' }, slots)


SM.Calendar.Event = React.createClass

  componentDidMount: ->
    if SM.Calendar.Container.Store.getSelectedMode().id <= 3
      if SM.ios
        $(this.refs.evt.getDOMNode()).on "touchend", (e) =>
          this.handleClick()
      else
        $(this.refs.evt.getDOMNode()).on SM.events.click, (e) =>
          this.handleClick()
  handleClick: ->
    SM.Calendar.Form.editEvent(this.props.data.event)

  dateInCell: (dt) ->
    return (dt >= this.props.cell.start && dt <= this.props.cell.end)

  render: ->
    props = this.props

    cls = ['cal-event']
    icon = ''
    time = ''
    title = ''
    desc = props.data.event.description
    starts = false
    continues = false
    # lengthInWords = ''
    priv = ''
    alrt = ''

    cls.push "cal-event-overdue" if @props.data.event.overdue
    cls.push "cal-event-completed" if @props.data.event.completed
    cls.push "cal-event-current" if @props.data.event.current

    if @dateInCell(this.props.data.event.start_at)
      starts = true
      cls.push "cal-event-starts"
      time =  React.createElement 'b', null, @props.data.event.start_at.format('HH:mm') if !this.props.data.event.all_day
      icon = React.createElement 'i', className: @props.data.event.icon
      priv = React.createElement 'i', className: 'fa fa-eye-slash sm-red' if @props.data.event.is_private

      alrt_cls = ['cal-alert','fa','fa-bell']
      if @props.data.event.alert_mins != -1
        if @props.data.event.alert_seen
          alrt_cls.push('sm-grey')
        else
          alrt_cls.push('sm-red')
        alrt = React.createElement 'i', className: alrt_cls.join(' ')


      rhs = React.createElement 'div', className: 'cal-event-rhs', alrt, priv


    if @dateInCell(this.props.data.event.end_at)
      cls.push "cal-event-ends"

    if !starts
      if @props.cell_idx == 0
        continues = true

      if SM.Calendar.Container.Store.getSelectedMode().id > 1
        if SM.Calendar.Container.Store.daysSinceBeginningOfWeek(this.props.cell.start)==0
          continues = true


    if continues
      cls.push "cal-event-continues"
      desc = "... " + desc

    clsInner = ['cal-event-inner']

    if continues or starts
      title = React.createElement('div', { className: 'cal-event-description' }, desc)
      # lengthInWords = React.createElement 'i', { className: 'cal-event-length' }, SM.timeline.differenceInWords(@props.data.event.start_at,@props.data.event.end_at,@props.data.event.all_day,true)
      offset = @props.data.len - @props.data.pos
      offset = 10 if offset > 10
      clsInner.push 'inner-' + offset

    inner = ''
    if SM.Calendar.Container.Store.getSelectedMode().id <= 3
      inner = React.createElement('div', { className: clsInner.join(' ') }, icon, time, rhs, title)

    React.createElement 'div', { className: 'cal-slot' }, React.createElement('div', {
      ref: 'evt'
      className: cls.join(' ')
      'data-id': props.data.event.id
    }, inner)


