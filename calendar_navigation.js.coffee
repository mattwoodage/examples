
SM.Calendar.Navigation.Store = {}

SM.Calendar.Navigation.View = React.createClass
  componentDidMount: ->
    setTimeout(SM.Calendar.buildColleagueDropdown,200)

  render: ->
    modeButtons = @props.modes.map((mode, i) ->
      React.createElement SM.Calendar.ModeBtn,
        key: i
        idx: i
        mode: mode
    )

    React.createElement 'div', null, React.createElement('div', { className: 'cal-colleague' }),
    React.createElement 'div', { className: 'cal-navigation btn-toolbar' }, React.createElement(SM.Calendar.MoveBtn,
      dir: '0'
      icon: ''), React.createElement(SM.Calendar.MoveBtn,
      dir: '-1'
      icon: 'fa-chevron-left'), React.createElement(SM.Calendar.DateInput, selectedDate: @props.selectedDate), React.createElement(SM.Calendar.MoveBtn,
      dir: '1'
      icon: 'fa-chevron-right'), React.createElement('div', { className: 'btn-group' }, modeButtons), React.createElement('div', { className: 'btn-group' }, React.createElement(SM.Calendar.AddBtn, {}, null)), React.createElement('div', { className: 'btn-group cal-loader-container' }, React.createElement('div', { id:'cal-loader' })), React.createElement('div', { className: 'btn-group' }, React.createElement(SM.Calendar.CloseBtn, {}, null))

SM.Calendar.MoveBtn = React.createClass
  componentDidMount: ->
    $(this.refs.lnk.getDOMNode()).on SM.events.click, (e) =>
      this.handleClick()
  handleClick: ->
    SM.Calendar.Container.Store.moveSelectedDate(this.props.dir)
  render: ->
    if this.props.dir == "0"
      content = "Today"
    else
      cls = "fa " + this.props.icon
      content = React.createElement 'i', className: cls
    React.createElement 'a', {
      ref: 'lnk'
      className: 'btn'
      href: '#'
    }, content

SM.Calendar.DateInput = React.createClass
  componentDidMount: ->
    $(this.refs.dt.getDOMNode()).smdatepicker()
    $(this.refs.dt.getDOMNode()).on "change", (e) =>
      this.handleDateChange()

  componentWillUnmount: ->
    # remove date picker

  handleDateChange: ->
    SM.Calendar.Container.Store.setSelectedDate(Date.parse(this.refs.dt.getDOMNode().value))
  render: ->
    val = this.props.selectedDate.format('DD MMM YYYY')

    React.createElement 'input',
      className: 'cal-selected-date input-small'
      value: val
      ref: 'dt'
      'data-date-format': 'd M yyyy'
      'data-type': 'date'
      readonly: ''
      type: 'text'

  componentDidUpdate: (prevProps, prevState) ->
    $(this.refs.dt.getDOMNode()).val(this.refs.dt.getDOMNode().value)

SM.Calendar.ModeBtn = React.createClass
  handleClick: ->
    SM.Calendar.Container.Store.setSelectedMode(this.props.idx)
  render: ->
    cls = ["cal-mode","btn"]
    if SM.Calendar.Container.Store.getSelectedMode().id == this.props.mode.id
      cls.push("btn-info")

    React.createElement 'a', {
      href: '#'
      onClick: @handleClick
      className: cls.join(' ')
    }, @props.mode.lbl

SM.Calendar.AddBtn = React.createClass
  handleClick: ->
    SM.Calendar.Form.newEvent({user_id:SM.Calendar.Container.Store.getUser(),created_by:SM.currentUser.id})
  render: ->
    cls = ["btn btn-primary"]
    React.createElement 'a', {
      href: '#'
      onClick: @handleClick
      className: cls.join(' ')
    }, 'New Event'

SM.Calendar.CloseBtn = React.createClass
  handleClick: ->
    SM.Calendar.hide()
  render: ->
    cls = ["btn"]
    React.createElement 'a', {
      href: '#'
      onClick: @handleClick
      className: cls.join(' ')
    }, 'Close'

SM.Calendar.buildColleagueDropdown = ->
  $("#calendar .cal-colleague").html("<select></select>")
  $("#calendar .cal-colleague select").html($("#colleague-dropdown select").html())
  if SM.ios
    $("#calendar .cal-colleague select").val SM.currentUser.id
  else
    $("#calendar .cal-colleague select").select2 width: "190px"
    $("#calendar .cal-colleague select").select2().val(SM.currentUser.id).trigger('change')

  $("#calendar .cal-colleague select").change ->
    SM.Calendar.updateColleague()
  SM.Calendar.updateColleague()
  SM.Calendar.Container.buildLoader()

SM.Calendar.updateColleague = ->
  user_id = Number($("#calendar .cal-colleague select").val())
  SM.Calendar.Container.Store.setUser(user_id)

