/*
    SM.diary
    Customisable diary for vehicle bookings
*/





$.xhrPool = {};
$.xhrPool.requests = [];
$.xhrPool.abortAll = function() {
    if ($.xhrPool.requests.length) {
      $.each($.xhrPool.requests, function(idx, jqXHR) {
        if (jqXHR) jqXHR.abort();
      });
    }
    $.xhrPool.requests = [];
};

$.ajaxSetup({
    beforeSend: function(jqXHR,settings) {
        jqXHR.url = settings.url;
        $.xhrPool.requests.push(jqXHR);
    },
    complete: function(jqXHR) {
        var index = -1
        var j, _i, _ref, _len;
        _ref = $.xhrPool.requests;
        _len = _ref.length;
        for (_i = 0; _i < _len; _i++) {
          j = _ref[_i];
          if (j.url === jqXHR.url) {
            index = j;
          }
        }
        if (index > -1) {
            $.xhrPool.requests.splice(index, 1);
        }
    }
});






(function(window) {

  SM.diary = {};

  SM.diary.DO_LOCK = true
  SM.diary.DONT_LOCK = false
  SM.diary.DO_BOOK = true
  SM.diary.DONT_BOOK = false

  SM.diary.IS_NEW = true
  SM.diary.NOT_NEW = false

  SM.diary.LEFT = -1
  SM.diary.RIGHT = 1
  SM.diary.NONE = 0

  SM.diary.DO_RELOAD_BOOKINGS = true
  SM.diary.DONT_RELOAD_BOOKINGS = false

  SM.diary.IS_LIFTED = true
  SM.diary.NOT_LIFTED = false

  SM.diary.DO_SHRINK = true
  SM.diary.DONT_SHRINK = false

  SM.diary.timer = undefined

  SM.diary.DO_NEGATIVE = true
  SM.diary.DONT_NEGATIVE = false

  SM.diary.DO_CALC_PREP = true
  SM.diary.DONT_CALC_PREP = false

  SM.diary.DRAG_MOVE = 1
  SM.diary.DRAG_LEFT = 2
  SM.diary.DRAG_RIGHT = 3

  SM.diary.ONE_DAY_IN_MINUTES = 60*24

  SM.diary.SCALE_OPTIONS = [
    {id:'DY',fmt:0,text:'Day',       colUnit:'hour', unit:'hour', num:15, startMinutes:60*6  ,snapToMinutes:15, template:'D MMM YYYY HH:mm', format:'DD-MM-YYYY HH:mm'},
    {id:'MO',fmt:0,text:'Morning',   colUnit:'hour', unit:'hour', num:5,  startMinutes:60*7  ,snapToMinutes:15, template:'D MMM YYYY HH:mm', format:'DD-MM-YYYY HH:mm'},
    {id:'LT',fmt:0,text:'Lunchtime', colUnit:'hour', unit:'hour', num:5,  startMinutes:60*10 ,snapToMinutes:15, template:'D MMM YYYY HH:mm', format:'DD-MM-YYYY HH:mm'},
    {id:'AF',fmt:0,text:'Afternoon', colUnit:'hour', unit:'hour', num:5,  startMinutes:60*13 ,snapToMinutes:15, template:'D MMM YYYY HH:mm', format:'DD-MM-YYYY HH:mm'},
    {id:'EV',fmt:0,text:'Evening',   colUnit:'hour', unit:'hour', num:5,  startMinutes:60*16 ,snapToMinutes:15, template:'D MMM YYYY HH:mm', format:'DD-MM-YYYY HH:mm'},
    {id:'FD',fmt:0,text:'Day (24h)', colUnit:'hour', unit:'day',  num:1,  snapToMinutes:15,   template:'D MMM YYYY', format:'DD-MM-YYYY'},
    {id:'W1',fmt:1,text:'Week',      colUnit:'day',  unit:'week', num:1,  snapToMinutes:1440, template:'D MMM YYYY', format:'DD-MM-YYYY'},
    {id:'W4',fmt:2,text:'4 Week',    colUnit:'day',  unit:'week', num:4,  snapToMinutes:1440, template:'D MMM YYYY', format:'DD-MM-YYYY'},
    {id:'W12',fmt:3,text:'12 Week',  colUnit:'week', unit:'week', num:12, snapToMinutes:1440, template:'D MMM YYYY', format:'DD-MM-YYYY'},
    {id:'W52',fmt:3,text:'52 Week',  colUnit:'week', unit:'week', num:52, snapToMinutes:1440, template:'D MMM YYYY', format:'DD-MM-YYYY'}
  ]


  SM.diary.first_load = true

  SM.diary.init = function(options) {

    var defaults;
    defaults = {};
    this.settings = $.extend({}, defaults, options);
    SM.diary.defaults = {
      rowHeight:100,
      periodInMinutes:2000,
      infinite:false,
      defaultScale:"W1",
      availableScales:undefined,
      minimumBookingMinutes:[],
      maximumBookingMinutes:[],
      defaultBookingMinutes:[],
      canBookWeekends:false,
      canPrepWeekends:false,
      canStartEndWeekends:false,
      canStartEndHolidays:false,
      prepPeriodInMinutes:[],
      canBookAfterMinutes:[],
      canSetLogisticsCapacity:false,
      canSetLogisticsCapacityLimits:false,
      selectedDate:undefined,
      diaryDisplayVehicleDistance: false,
      bookingLoadBatchSize: 10
    };
    SM.diary.settings = $.extend({}, SM.diary.defaults, options);

    SM.bookings.initExtensionForm()

    SM.diary.today = Date.today()

    SM.diary.loading = false;

    SM.diary.holdingBooking = {data: {}, idx: 0, startsOutside: false, endsOutside: false}

    SM.diary.columns = [];
    SM.diary.vehicles = [];
    SM.diary.bookings = [];

    SM.diary.menuHidden = false

    SM.iPad = false
    if (navigator.userAgent.match(/iPad/i)) SM.iPad = true

    SM.diary.selectedVehicle = undefined;
    SM.diary.selectedVehicleOffset = 0;

    SM.diary.formIsOpen = false;

    SM.diary.canBookHere = false;

    SM.diary.tempBooking = {};

    // SM.diary.mouseUpLock = false;
    SM.diary.cursor = {}
    SM.diary.cursor.date = undefined

    SM.diary.tempBookingActive = false;
    SM.diary.tempBookingPlaced = false;

    SM.diary.activeBooking = undefined;

    SM.diary.saving = {};

    //SM.diary.scrollLeftMin = 0;
    //SM.diary.scrollLeftMax = 0;
    //SM.diary.lastScrollLeft = 0;
    SM.diary.lastScrollTop = 0;
    SM.diary.scrollStartPos = 0;
    SM.diary.ignoreScroll = false;
    SM.diary.backupBooking = undefined;
    SM.diary.drag = {}


    SM.diary.restrictionsManager = new SM.diary.RestrictionsManager()

    SM.diary.logistic_centers = [];

    if (SM.diary.settings.scale!="") SM.diary.settings.defaultScale = SM.diary.settings.scale

    if (!SM.diary.settings.selectedDate) SM.diary.settings.selectedDate = new Date().clearTime()

    SM.diary.setScaling(SM.diary.settings.defaultScale, true)   //set default scale

    SM.diary.bind();

  };

  SM.diary.markVehiclesWithFleetLimits = function() {
    var counter, vehicle, fleetLimitsStartPerc, fleetLimitsWidthPerc, fleetLimitsHTML,
        vehicle_row, vehicle_defleet_date, minutesBetweenDefleetAndDiaryEnd;
    for (counter = 0; counter < SM.diary.vehicles.length; counter++) {
      vehicle = SM.diary.vehicles[counter];
      vehicle_defleet_date = Date.parse(vehicle.defleet_date) || Infinity;

      if (vehicle_defleet_date <= SM.diary.settings.to) {
        fleetLimitsStartPerc = SM.diary.dateToPercentage(vehicle_defleet_date);
        if (parseInt(fleetLimitsStartPerc) < 0) fleetLimitsStartPerc = '0'; // don't start before the beginning of diary.

        minutesBetweenDefleetAndDiaryEnd = (SM.diary.settings.to - vehicle_defleet_date) / 60000;
        fleetLimitsWidthPerc = SM.diary.minutesToPercentage(minutesBetweenDefleetAndDiaryEnd);
        if (parseInt(fleetLimitsWidthPerc) > 100) fleetLimitsWidthPerc = '100';

        fleetLimitsHTML = $("<div class='diary-fleet-limits' data-vehicle-id='" + vehicle.id + "'><span class='fleet-limits-inner'></span></div>");
        fleetLimitsHTML.css('left', fleetLimitsStartPerc + '%');
        fleetLimitsHTML.css('width', fleetLimitsWidthPerc + '%');
        if (SM.currentUser.max_clearance_level <= 17) {
          fleetLimitsHTML.css('z-index', '0');
          fleetLimitsHTML.css('cursor', 'auto');
        }

        vehicle_row = SM.diary.getVehicleWithId(vehicle.id).row;
        vehicle_row.append(fleetLimitsHTML);
      }
    }
  }

  SM.diary.setScaling = function(id, build) {
    var newScale = SM.diary.SCALE_OPTIONS[0]
    var _i, _len, _ref;
    _ref = SM.diary.SCALE_OPTIONS;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      if (_ref[_i].id === id) {
        newScale = _ref[_i];
      }
    }
    SM.diary.closeVehicle()
    SM.diary.settings.scaling = newScale
    SM.diary.settings.container.attr("class","diary-cannot-select scale-" + SM.diary.settings.scaling.fmt)
    //SM.diary.lastScrollLeft = 0
    if (build) SM.diary.build();
  };

  SM.diary.build = function() {

    SM.diary.settings.from = SM.diary.settings.selectedDate.clearTime()

    if (SM.diary.settings.scaling.startMinutes) {
      SM.diary.settings.from.add(SM.diary.settings.scaling.startMinutes).minutes()
    }

    if (SM.diary.settings.scaling.fmt==3) {
      SM.diary.settings.from.moveToDayOfWeek(1, -1)
    }

    SM.diary.settings.to = moment(SM.diary.settings.from.clone())
    SM.diary.settings.to.add(SM.diary.settings.scaling.num, SM.diary.settings.scaling.unit)
    SM.diary.settings.to = SM.diary.settings.to.toDate()

    SM.diary.settings.periodInMinutes = (SM.diary.settings.to - SM.diary.settings.from) / 60000

    SM.diary.columns = [];

    var from = moment(SM.diary.settings.from.clone())
    var to = moment(SM.diary.settings.to.clone())

    SM.diary.restrictionsManager.setRange(from.toDate().clone(),to.toDate().clone())

    var startTime = from.clone()
    var endTime = from.clone()
    while (endTime.unix() != to.unix()) {
      endTime = startTime.clone().add(1, SM.diary.settings.scaling.colUnit)
      SM.diary.columns.push({start:startTime.toDate().clone(),end:endTime.toDate().clone().add(-1).seconds()})
      startTime = endTime.clone()
    }

    if (SM.diary.manualStateChange == true) SM.diary.setViewParams()

    SM.diary.updatePagination()
  };


  SM.diary.setViewParams = function() {
    $("#scale").val(SM.diary.settings.scaling.id)
    $("#start_from").val(SM.diary.settings.from.toString("d MMM yyyy"))
    SM.diary.triggerStateChange()
  }



  SM.diary.triggerStateChange = function() {
    var defaults = {
      model: 'vehicles',
      formSelector: "#vehicles_search",
      handler: 'DIARY'
    }
    SM.triggerStateChange(defaults)
  }

  SM.diary.updateFromState = function(state) {
    qs = new SM.QueryString(state.hash);
    SM.diary.updateScaleFromState(qs.get('scale'))
    SM.diary.updateDateFromState(qs.get('start_from').split('+').join(' '))
  }

  SM.diary.updateScaleFromState = function(scale) {
    items = $('div.diary-scale-btn-group a.diary-scale')
    $.each(items, function(i,item) {
      if ($(item).data('scale') == scale) {
        $('button.diary-scale-btn').html($(item).html())
        SM.diary.setScaling(scale, false)
        return
      }
    })
  }

  SM.diary.updateDateFromState = function(dt) {
    $('#date').html(dt)
    SM.vehicles.updateDiaryNav();
    SM.diary.gotoDate(dt)
  }

  SM.diary.updatePagination = function() {
    qs_curr = new SM.QueryString();
    $('div.pagination a').each(function() {
      qs_lnk = new SM.QueryString($(this).attr('href'))
      pg = qs_lnk.get('page')
      $(this).attr('href', '/vehicles?' + qs_curr.queryString + '&page=' + pg)
    })
  }

  SM.diary.gotoDate = function(dt) {
    if (SM.diary.tempBookingActive) {
      SM.diary.clearTempBooking()
    }
    //SM.diary.lastScrollLeft = 0
    SM.diary.settings.selectedDate = Date.parse(dt)
    SM.diary.build()
    SM.diary.draw(SM.diary.DO_RELOAD_BOOKINGS)
  };

  SM.diary.reload = function() {
    if (SM.diary.tempBookingActive) {
      SM.diary.clearTempBooking()
    }
    SM.diary.draw(SM.diary.DO_RELOAD_BOOKINGS)
  }

  SM.diary.loadBookings = function() {
    SM.diary.bookings = []
    if ($.xhrPool.requests.length) $.xhrPool.abortAll();

    if(SM.diary.vehicles.length > 0){
      SM.diary.loadBookingsForVehicles();
    }

    $("div.diary-item-cover",SM.diary.settings.container).show();
    SM.diary.markVehiclesWithFleetLimits();
  };

  SM.diary.loadBookingsForVehicles = function(v) {
    var from = SM.diary.settings.from.toISOString()
    var to = SM.diary.settings.to.toISOString()
    var batchSize = SM.diary.settings.bookingLoadBatchSize
    var vehicleIds = _.pluck(SM.diary.vehicles, 'id');
    var batches = _.groupBy(vehicleIds, function(element, index){
      return Math.floor(index/batchSize);
    });

    _.each(batches, function(batchOfVehicleIds) {
      $.ajax({
        url: '/diary/bookings',
        data: {
          from: from,
          to: to,
          vehicles: batchOfVehicleIds
        }
      }).done(function(data) {
        _.each(data.bookings, function(booking){
          bookingVehicle = SM.diary.getVehicleWithId(booking.vehicle_id)
          SM.diary.showBookingForVehicle(bookingVehicle, booking)
        });
        $("div.diary-item-cover",SM.diary.settings.container).hide()
      });
    });

  };

  SM.diary.showBookingForVehicle = function(vehicle, bookingData) {
    var booking = {
      data: bookingData,
      idx: SM.diary.bookings.length,
      blocked: false,
      draggable: true,
      draggableLeft: true,
      draggableRight: true,
      isTemp: false
    }

    SM.diary.fixDates(booking);
    SM.diary.calculateMinutesForBooking(booking);

    if (bookingData.locked_for_edit) {
      booking.draggable = false;
      booking.draggableLeft = false;
      booking.draggableRight = false;
    }

    if (!bookingData.creator_id) {
      booking.blocked = true;
      booking.draggable = false;
      booking.draggableLeft = false;
      booking.draggableRight = false;
    }

    SM.diary.bookings.push(booking);
    SM.diary.drawBooking(booking);
  }

  SM.diary.removeTooltips = function() {
    $("div.tooltip").remove()
  }

  SM.diary.startTimer = function() {
    clearInterval(SM.diary.timer)
    SM.diary.timer = setInterval(SM.diary.updateNow,10000);
    SM.diary.updateNow()
  }

  SM.diary.stopTimer = function() {
    clearInterval(SM.diary.timer)
    SM.diary.timer = undefined;
  }

  SM.diary.updateNow = function() {
    currentPercent = SM.diary.dateToPercentage(new Date())
    if ((currentPercent < 0) || (currentPercent > 100)) {
      SM.diary.stopTimer()
      currentPercent = -100
    }
    SM.diary.stage.now.css("left",currentPercent+"%")
    SM.diary.stage.now.css("width","1px")
  }

  SM.diary.getOffset = function() {
    //this isn't very nice. don't know how else to do it right now
    offset = 183
    if ($("#pinned-view-tabs").is(":visible")) {
      offset += 54
    }
    if ($("#searches").is(":visible")) {
      offset += 176
    }
    if ($("#search-builder").is(":visible")) {
      offset += 167
    }
    return offset
  }

  SM.diary.updateCursor = function (event) {
    'use strict';
    var snapToMinutes = SM.diary.snapToMinutes();
    // Calculate cursor position
    var position = SM.diary.calculateCursorPositionOnTimeline(event);

    // Set cursor active state based on current position
    SM.diary.updateCursorState(position);

    // Update cursor position
    SM.diary.cursor.css('left', position + '%');

    // Update cursor label
    SM.diary.updateCursorLabel(snapToMinutes);

    // Update cursor class
    SM.diary.updateCursorClass();
  };

  SM.diary.calculateCursorPositionOnTimeline = function (event) {
    'use strict';
    var pixelsToPercentage = SM.diary.pixelsToPercentage(event.pageX);
    var totalOffset = (pixelsToPercentage + SM.diary.cursor.xOffset);
    var dateFromOffset = SM.diary.percentageToDate(totalOffset);
    SM.diary.cursor.date = (SM.diary.snapDate(dateFromOffset));
    return SM.diary.dateToPercentage(SM.diary.cursor.date);
  };

  SM.diary.updateCursorState = function (position) {
   'use strict';
    if ((position < 0) || SM.diary.tempBookingPlaced) {
      SM.diary.setCursorInactive();
    } else {
      SM.diary.setCursorActive();
    }
  };

  SM.diary.updateCursorLabel = function (snapToMinutes) {
    'use strict';
    var label = SM.diary.cursor.date.toString('HH:mm');
    if (snapToMinutes >= SM.diary.ONE_DAY_IN_MINUTES) {
      label = SM.diary.cursor.date.toString('d/M');
    }
    $('div.txt', SM.diary.cursor).html(label);
  };

  SM.diary.updateCursorClass = function () {
    'use strict';
    var ok = SM.diary.canBookHere;
    if (ok) {
      SM.diary.cursor.addClass('ok');
    } else {
      SM.diary.cursor.removeClass('ok');
    }
  };

  SM.diary.validateBooking = function(booking,calculatePrep) {

    var warnings = []
    var ok = true

    if (booking.data.type != 'BlankBooking') {


      if ((!SM.diary.settings.canStartEndWeekends
            || $.inArray('Can weekend create bookings all', SM.currentUser.permissions) === -1)) {
        if ((!booking.data.start_at.is().weekday()) || (!booking.data.end_at.is().weekday())) {
          warnings.push("Can't start or end on a weekend")
        }
      }
      if (!SM.diary.settings.canBookWeekends) {
        if (booking.data.start_at.getWeek() != booking.data.end_at.getWeek()) {
          warnings.push("Can't book over a weekend")
        }
      }

      // append restrictions warnings to other warnings
      _.map(SM.diary.restrictionsManager.validateBooking(booking), function(w) { warnings.push(w) })

    }


    var _ref, _len, bk;
    _ref = SM.diary.bookings;
    _len = _ref.length;
    for (_i = 0; _i < _len; _i++) {
      bk = _ref[_i];
      if (bk.data.id !== booking.data.id && bk.data.vehicle_id === booking.data.vehicle_id) {
        if (SM.diary.rangesOverlap(bk.data.start_at, bk.data.prep_end, booking.data.start_at, booking.data.prep_end)) {
          warnings.push('Conflicts with Booking ' + bk.data.id);
        }
      }
    }

    var canBookAfterMinutes = Number(SM.diary.settings.canBookAfterMinutes[booking.data.type]) || -1;
    if (canBookAfterMinutes !== -1) {
      var canBookAfterTime = SM.diary.calculateEmbargo(canBookAfterMinutes, moment());
      if (booking.data.start_at < canBookAfterTime.toDate()) {
        warnings.push("Can't book before " + canBookAfterTime.toDate().toString("d MMM yyyy HH:mm"));
      }
    }

    if (calculatePrep) {
      if (booking.data.prep_minutes != 0) {

        SM.diary.calculatePrep(booking)
        //check conflicts
        var bk, _i, _len, _ref;
        _ref = SM.diary.bookings;
        _len = _ref.length;
        for (_i = 0; _i < _len; _i++) {
          bk = _ref[_i];
          if ((bk.data.id !== booking.data.id) && (bk.data.vehicle_id === booking.data.vehicle_id) ? SM.diary.rangesOverlap(bk.data.start_at, bk.data.prep_end, booking.data.prep_start, booking.data.prep_end) : void 0) {
            warnings.push("Prep conflicts with Booking " + bk.data.id);
          }
        }
      }
    }

    var vehicle = SM.diary.getVehicleWithId(booking.data.vehicle_id);
    var vehicle_defleet_date = Date.parse(vehicle.defleet_date);
    if (SM.currentUser.max_clearance_level >= 17 && (booking.data.start_at >= vehicle_defleet_date || booking.data.end_at >= vehicle_defleet_date)) {
      warnings.push('Booking is not available on this vehicle as the de-fleet date has been reached');
    }

    warnings = _.uniq(warnings)

    if (warnings.length) ok = false

    if (ok) SM.diary.cursor.addClass("ok")
    else SM.diary.cursor.removeClass("ok")

    booking.data.valid = ok
    booking.data.warnings = warnings

    SM.diary.styleBookingForValidity(booking)

    return ok
  }

  SM.diary.locked_by_site = function (vehicle_site_id, res_site_id) {
    if (res_site_id == "" || res_site_id == null) {
      return true;
    }
    if (vehicle_site_id == res_site_id) {
      return true;
    }
    return false;
  }

  // Calculate embargo time from the current time
  SM.diary.calculateEmbargo = function(canBookAfterMinutes, currentTime) {
    "use strict";
    var requiredMinutes = canBookAfterMinutes;
    var currentMinutes = 0;

    if (!SM.diary.canPrepOn(currentTime)) {
      currentTime = currentTime.nextWorkingDay();
    }

    while (currentMinutes < requiredMinutes) {
      if ((requiredMinutes - currentMinutes) % 60 === 0) {
        currentTime.add(60, "minutes");
        if (SM.diary.canPrepOn(currentTime)) {
          currentMinutes  += 60;
        }
      } else {
        currentTime.add(1, "minute");
        if (SM.diary.canPrepOn(currentTime)) {
          currentMinutes += 1;
        }
      }
    }
    return currentTime.clone();
  };

  SM.diary.calculatePrep = function(booking) {
    if (booking.data.prep_minutes == 0) {
      // prep start and end must both be set to booking end at if there is NO PREP.
      // not one second after end - otherwise it prevents a booking being created immediately after at 00 secs
      booking.data.prep_start = booking.data.end_at.clone()
      booking.data.prep_end = booking.data.end_at.clone()
    }
    else {
      SM.diary.calculatePrepStart(booking)
      SM.diary.calculatePrepEnd(booking)
    }
  }

  SM.diary.calculatePrepStart = function(booking) {
    var st = moment(booking.data.end_at_plus_one_second)
    var ok = false
    while (!ok) {
      if (SM.diary.canPrepOn(st)) {
        ok = true
      }
      else {
        st.add(1, 'minutes')
      }
    }
    booking.data.prep_start = st.toDate()
  }

  SM.diary.calculatePrepEnd = function(booking) {
    // this method needs to replicate what the backend calculation does. The backend calculation overrides this one.
    // i plan to make the backend calculation loop at snap-size minute intervals - not at 1 minute intervals
    // i plan to remove all prep calculations from the js and instead to ask the backend for it.
    // test every one minute starting one minute after booking end (59 secs)
    var required_mins = booking.data.prep_minutes
    var current_mins = 0
    var current_time = moment(booking.data.prep_start.clone()).subtract(1, 'seconds')
    while (current_mins < required_mins) {
      current_time.add(1, 'minutes')
      if (SM.diary.canPrepOn(current_time)) current_mins += 1
    }
    booking.data.prep_end = current_time.toDate()
  }

  SM.diary.canPrepOn = function(moment) {

    if (!SM.diary.settings.canPrepWeekends) {
      if (moment.isWeekend()){
        return false
      }
    }
    if (SM.diary.restrictionsManager.momentIsHoliday(moment) || moment.isHoliday()) return false
    return true
  }

  SM.diary.styleBookingForValidity = function(booking) {

    if (booking.data.valid) {
      booking.obj.removeClass("invalid")
      //$(".diary-booking-status",booking.obj).html("")
      //$(".diary-booking-customer",booking.obj).html("")
      $("i.diary-booking-icon",booking.obj).hide().removeClass("fa-ban")
      SM.diary.removeWarnings(booking)
    }
    else {
      booking.obj.addClass("invalid")
      $(".diary-booking-status",booking.obj).html("Can't book here!")
      $(".diary-booking-customer",booking.obj).html(booking.data.warnings.join("<br/>"))
      $("i.diary-booking-icon",booking.obj).show().addClass("fa-ban")
      SM.diary.addWarnings(booking)
    }
  }

  SM.diary.addWarnings = function(booking) {
    $("div.diary-booking-inner",booking.obj).attr("rel","tooltip")
    $("div.diary-booking-inner",booking.obj).attr("data-original-title",booking.data.warnings.join("<br/>"))
    $("div.diary-booking-inner",booking.obj).tooltip("show")
  }

  SM.diary.removeWarnings = function(booking) {
    $("div.diary-booking-inner",booking.obj).removeAttr("rel")
    $("div.diary-booking-inner",booking.obj).removeAttr("data-original-title")
  }

  SM.diary.setCursorActive = function() {
    SM.diary.cursor.active = true
    SM.diary.cursor.removeClass("hidden")
  }

  SM.diary.setCursorInactive = function() {
    SM.diary.cursor.active = false
    SM.diary.cursor.addClass("hidden")
  }


  SM.diary.setCursorOffset = function(booking,direction) {
    cursorPerc = SM.diary.dateToPercentage(SM.diary.cursor.date)
    if (direction == SM.diary.LEFT) {
      bookingPerc = SM.diary.dateToPercentage(booking.data.start_at)
    }
    else {
      bookingPerc = SM.diary.dateToPercentage(booking.data.end_at)
    }
    SM.diary.cursor.xOffset = bookingPerc - cursorPerc;
  }

  SM.diary.clearCursorOffset = function() {
    SM.diary.cursor.xOffset = 0;
  }


  SM.diary.unselectVehicle = function() {
    //if (!SM.diary.tempBookingActive) {
      if (SM.diary.selectedVehicle) {
        SM.diary.selectedVehicle.row.removeClass("selected")
        $(".item",SM.diary.menu.items).eq(SM.diary.selectedVehicle.idx).removeClass("selected")
        $(".diary-item-hotspot",SM.diary.calendar.hotspots).eq(SM.diary.selectedVehicle.idx).removeClass("selected")
        SM.diary.selectedVehicle = undefined
        SM.diary.removeTooltips()
        if (!SM.diary.drag.active) {
          SM.diary.clearTempBooking()
          SM.diary.activeBooking = undefined;
        }
      }
   // }
  }




  SM.diary.selectVehicle = function(veh) {
    if (SM.diary.selectedVehicle != veh) {

      if ((!SM.diary.tempBookingActive && !SM.diary.activeBooking) || (SM.diary.drag.active && (SM.diary.drag.type == SM.diary.DRAG_MOVE))) {
        if (SM.diary.selectedVehicle) {
          SM.diary.unselectVehicle()
        }
        if (SM.diary.drag.active) {
          SM.diary.drag.booking.data.vehicle_id = veh.id;
        }
        if (SM.diary.tempBooking.data) {
          SM.diary.tempBooking.data.vehicle_id = veh.id;
        }
        SM.diary.selectedVehicle = veh;
        SM.diary.selectedVehicle.row.addClass("selected")
        $(".item",SM.diary.menu.items).eq(SM.diary.selectedVehicle.idx).addClass("selected")
        $(".diary-item-hotspot",SM.diary.calendar.hotspots).eq(SM.diary.selectedVehicle.idx).addClass("selected")
      }
    }
  }


  SM.diary.selectVehicleFromTouch = function(touchEvent) {
    elm = $(touchEvent.originalEvent.target)
    SM.diary.selectVehicle(SM.diary.vehicles[elm.index()])
    SM.diary.canBookHere = true
  }

  SM.diary.openVehicle = function() {
    if (SM.diary.formIsOpen) {
      SM.diary.closeVehicle()
    }
    SM.diary.formIsOpen = true
    SM.diary.selectedVehicle.row.addClass("open selected")

    $(".item",SM.diary.menu.items).eq(SM.diary.selectedVehicle.idx).addClass("open")
    $(".diary-item-hotspot",SM.diary.calendar.hotspots).eq(SM.diary.selectedVehicle.idx).addClass("open selected")
    $(".diary-item-hotspot",SM.diary.calendar.hotspots).eq(SM.diary.selectedVehicle.idx).append(SM.diary.create)
  }

  SM.diary.closeVehicle = function() {
    if (SM.diary.formIsOpen) {
      SM.diary.formIsOpen = false
      SM.diary.selectedVehicle.row.removeClass("open")
      $(".item",SM.diary.menu.items).eq(SM.diary.selectedVehicle.idx).removeClass("open")
      $(".diary-item-hotspot",SM.diary.calendar.hotspots).eq(SM.diary.selectedVehicle.idx).removeClass("open")
      $("#diary-form").remove()
    }
  }

  SM.diary.updateScaleFactors = function() {
    SM.diary.calendar.width = $("div.diary-calendar").width()
    SM.diary.pixelsPerPercent = SM.diary.calendar.width / 100;
    SM.diary.menu.width = $("div.diary-menu").width()
  };

  SM.diary.snapDate = function (dt) {
    'use strict';
    var snapMinutes = SM.diary.snapToMinutes();
    var minutes = (dt - SM.diary.settings.from) / 1000 / 60;
    minutes = Math.round(minutes / snapMinutes) * snapMinutes;
    var snapPoint = SM.diary.settings.from.clone().add(minutes).minutes();
    if (snapMinutes > 60) {
      var fromOffset = moment(SM.diary.settings.from).utcOffset()
      var thisOffset = moment(snapPoint).utcOffset()
      snapPoint = snapPoint.add(fromOffset-thisOffset).minutes()
    }
    return snapPoint;
  };

  SM.diary.snapToMinutes = function() {
    'use strict';
    var scale = SM.diary.settings.scaling.id; // Scaling ID e.g. 'W1', 'DY', 'FD'
    var defaultForScale = SM.diary.settings.scaling.snapToMinutes; // Based on SM.diary.SCALE_OPTIONS
    var accountSetting = SM.diary.settings.globalSnapMinutes; // 'diary_global_snap_minutes' value
    return accountSetting && accountSetting[scale] ? accountSetting[scale] : defaultForScale
  };

  SM.diary.draw = function(reloadBookings) {
    SM.diary.settings.container.addClass("diary-cannot-select")

    SM.diary.removeTooltips()

    SM.diary.outer = $("<div class='diary-outer'>")
    SM.diary.scroll = $("<div class='diary-scroll'></div>")
    SM.diary.inner = $("<div class='diary-inner diary-cannot-select'></div>")

    SM.diary.stage = $("<div class='diary-stage'></div>")
    SM.diary.stage.now = $("<div class='diary-now'><div></div><b>Now</b></div>")
    SM.diary.cursor = $("<div class='diary-cursor'><div class='txt'></div></div>")
    SM.diary.cursor.xOffset = 0
    SM.diary.cursor.active = false

    $("div.txt",SM.diary.cursor).html("")

    scaling_options = ""
    var _i, _len, _ref, so;
    _ref = SM.diary.SCALE_OPTIONS;
    _len = _ref.length;
    for (_i = 0; _i < _len; _i++) {
      so = SM.diary.SCALE_OPTIONS[_i];
      if ((SM.diary.settings.availableScales === undefined) || ($.inArray(so.id, SM.diary.settings.availableScales) !== -1)) {
        scaling_options += "<li><a class='diary-scale' data-scale='" + so.id + "' href='#'>" + so.text + "</a></li>";
      }
    }


    SM.diary.panel = $("<div class='diary-panel'><div class='btn-group diary-scale-btn-group'><button class='diary-scale-btn btn btn-mini'>" + SM.diary.settings.scaling.text + "</button><button class='btn btn-mini dropdown-toggle' data-toggle='dropdown'><span class='caret'></span></button><ul class='dropdown-menu'>" + scaling_options + "</ul></div></div>")

    SM.diary.panel.fixed = $("<div class='diary-header-fixed'></div>")

    SM.diary.header = $("<div class='diary-header'></div>")
    SM.diary.header.columns = $("<div class='diary-header-columns'></div>")
    SM.diary.header.restrictions = $("<div class='diary-header-restrictions'></div>")
    SM.diary.header.daylabel = $("<a href='#' class='diary-header-daylabel'></a>")

    SM.diary.menu = $("<div class='diary-menu'></div>")
    SM.diary.menu.header = {}

    SM.diary.menu.items = $("<div class='diary-menu-items'></div>")
    SM.diary.calendar = $("<div class='diary-calendar'></div>")

    SM.diary.rows = $("<div class='diary-stage'></div>")

    SM.diary.create = $("<div id='diary-form'><div class='diary-form-container'><div class='diary-form-content'></div><a href='#' class='diary-form-close'><i class='icon-remove'></i></a></div></div>")

    // SM.diary.calendar.starter = $("<div class='diary-starter'><div class='circle'><i class='icon-plus icon-white'></i></div></div>")
    SM.diary.calendar.columns = $("<div class='diary-calendar-columns'></div>")
    SM.diary.calendar.dividers = $("<div class='diary-calendar-dividers'></div>")
    SM.diary.calendar.bookings = $("<div class='diary-calendar-bookings'></div>")
    SM.diary.calendar.hotspots = $("<div class='diary-calendar-hotspots'></div>")
    SM.diary.settings.container.html("")

    SM.diary.settings.container.append (SM.diary.outer)

    SM.diary.outer.append (SM.diary.panel)
    SM.diary.outer.append (SM.diary.header)
    SM.diary.outer.append (SM.diary.scroll)
    SM.diary.scroll.append (SM.diary.inner)

    SM.diary.header.append (SM.diary.stage)

    SM.diary.stage.append (SM.diary.stage.now)
    SM.diary.stage.append (SM.diary.cursor)

    SM.diary.stage.append (SM.diary.header.columns)
    SM.diary.stage.append (SM.diary.header.restrictions)
    SM.diary.stage.append (SM.diary.header.daylabel)
    SM.diary.panel.append (SM.diary.panel.fixed)

    //SM.diary.menu.css("width",SM.diary.settings.menuWidth + "px")

    SM.diary.inner.append (SM.diary.menu)

    SM.diary.inner.append (SM.diary.calendar)

    SM.diary.calendar.append (SM.diary.rows)
    // SM.diary.calendar.append (SM.diary.calendar.starter)

    SM.diary.rows.append (SM.diary.calendar.columns)
    SM.diary.rows.append (SM.diary.calendar.bookings)
    SM.diary.rows.append (SM.diary.calendar.hotspots)

    SM.diary.menu.append (SM.diary.menu.items)

    //check locked booking klasses
    SM.diary.processRestrictAvailableBookingTypes()

    //draw vehicles
    var accessories, dist, hotspot, img, overdue, v, vrm, site, _i, _len, _ref;
    _ref = SM.diary.vehicles;
    _len = _ref.length;
    for (_i = 0; _i < _len; _i++) {
      img = "";
      if (SM.diary.vehicles[_i].img) {
        img = SM.diary.vehicles[_i].img.replace("?src=", "?thumb=149x99&src=");
      }
      vrm = "";
      if (SM.diary.vehicles[_i].vrm) {
        vrm = "<B>" + SM.diary.vehicles[_i].vrm + "</B>";
      }

      overdue = SM.diary.vehicle_overdue(SM.diary.vehicles[_i].overdue);
      if (overdue === "") {
        overdue = SM.diary.vehicle_overdue(SM.diary.vehicles[_i].handback_overdue);
      }

      tooltip = (overdue) ? 'Vehicle has active overdue bookings. Please check vehicle booking availability.' : ''

      accessories = SM.diary.vehicle_accessories(SM.diary.vehicles[_i].accessories);
      dist = "";
      if (SM.diary.vehicles[_i].distance != '' && SM.diary.settings.diaryDisplayVehicleDistance) {
        dist = "<B class='dist'>" + SM.diary.vehicles[_i].distance + " mi</B>";
      }
      if (SM.currentAccount.settings.display_site_on_diary) {
        site = SM.diary.vehicles[_i].site_name;
      }
      else {
        site = '';
      }
      SM.diary.menu.items.append(
        "<div class='item row " + overdue + " " + accessories + "' data-id='" + SM.diary.vehicles[_i].id +"' title='"+tooltip+"' rel='tooltip' data-placement='right'>" +
          "<span>" +
            vrm +
            dist +
            "<span>" + SM.diary.vehicles[_i].description + "</span>" +
            "<span>" + site + "</span>" +
          "</span>" +
          img +
        "<div class='bg'></div></div>"
      );
      SM.diary.vehicles[_i].row = $("<div class='diary-item-row row'></div>");
      hotspot = $("<div class='diary-item-hotspot'></div>");

      SM.diary.vehicles[_i].cover = $("<div class='diary-item-cover'></div>")
      SM.diary.vehicles[_i].row.append(SM.diary.vehicles[_i].cover)

      SM.diary.calendar.columns.append(SM.diary.vehicles[_i].row);
      SM.diary.calendar.hotspots.append(hotspot);
    }



    //draw header
    var header = ""

    var last_tm = ""
    var last_hr = ""
    var last_dy = ""
    var last_mm = ""
    var last_l = ""


    var col, cls, columnEndsAt, columnStartsAt, dy, hr, last_dy, wid_perc, last_hr, last_mm, last_tm, mm, mmm, mn, tm, _i, _len, _ref;
    _ref = SM.diary.columns;
    _len = _ref.length;
    for (_i = 0; _i < _len; _i++) {
      col = _ref[_i];
      columnStartsAt = col.start;
      columnEndsAt = col.end;
      if (columnStartsAt) {
        tm = columnStartsAt.toString("HH:mm");
        hr = columnStartsAt.toString("HH");
        mn = columnStartsAt.toString("mm");
        dy = columnStartsAt.toString("dd");
        cls = [];
        cls.push("hr_" + hr);
        cls.push("mn_" + mn);
        cls.push("dy_" + dy);
        cls.push("i_" + _i);

        wid_perc = SM.diary.minutesToPercentage(SM.diary.differenceInMinutes(columnEndsAt,columnStartsAt))

        header += "<div class='column " + cls.join(" ") + " col " + SM.diary.stylesForColumn(col) + "' style='width:" + wid_perc + "%'><span class='cal'>";
        mm = "<B>" + columnStartsAt.toString("MMMM") + "</B> " + columnStartsAt.toString("yyyy");
        mmm = "<b class='wkd'>" + columnStartsAt.toString("ddd") + "</b> " + columnStartsAt.toString("dd") + " <B>" + columnStartsAt.toString("MMMM") + "</B> " + columnStartsAt.toString("yyyy");
        if (SM.diary.settings.scaling.fmt === 0) {
          header += "<span class='TM MN_" + mn + "'>" + tm + "</span>";
        } else if (SM.diary.settings.scaling.fmt === 1) {
          header += "<span class='M'><a href='#'><b>" + columnStartsAt.toString("MMM") + "</b> " + columnStartsAt.toString("yyyy") + "</a></span>";
          header += "<span class='DYM'>" + columnStartsAt.toString("ddd").substring(0, 2) + "</span>";
          header += "<span class='D'><a href='#' data-date='" + columnStartsAt.toString("d MMM yyyy") + "'>" + columnStartsAt.toString("dd") + "</a></span>";
        } else if (SM.diary.settings.scaling.fmt === 2) {
          header += "<span class='M'><a href='#'>" + columnStartsAt.toString("MMMM") + "</a></span>";
          header += "<span class='DYM'>" + columnStartsAt.toString("ddd").substring(0, 2) + "</span>";
          header += "<span class='D'><a href='#' data-date='" + columnStartsAt.toString("d MMM yyyy") + "'>" + columnStartsAt.toString("dd") + "</a></span>";
        } else if (SM.diary.settings.scaling.fmt === 3) {
          header += "<span class='M'><a href='#'>" + columnStartsAt.toString("MMMM") + "</a></span>";
          header += "<span class='WOY'>WEEK " + columnStartsAt.getWeek() + "</span>";
          header += "<span class='D'><a href='#' data-date='" + columnStartsAt.toString("d MMM yyyy") + "'>" + columnStartsAt.toString("dd") + "</a></span>";
        }
        header += "</span></div>";
        last_tm = tm;
        last_hr = hr;
        last_dy = dy;
        last_mm = mm;
      }
    }

    if (SM.diary.settings.scaling.fmt == 0) {
      SM.diary.header.daylabel.html(mmm)
      SM.diary.header.daylabel.data('date',columnStartsAt.toString("d MMM yyyy"))
    }

    SM.diary.header.columns.html(header)


    if (SM.diary.tempBookingActive) {
      SM.diary.redrawTempBooking()
    }

    SM.diary.loading = false

    if (reloadBookings) {
      SM.diary.loadBookings()
    }
    else {
      var _i, _len, _ref;
      _ref = SM.diary.bookings;
      _len = _ref.length;
      for (_i = 0; _i < _len; _i++) {
        SM.diary.drawBooking(SM.diary.bookings[_i]);
      }
      $("div.diary-item-cover",SM.diary.settings.container).hide()
    }

    SM.diary.restrictionsManager.update()

    SM.diary.startTimer()

    SM.diary.updateScaleFactors()

  };


  SM.diary.processRestrictAvailableBookingTypes = function() {
    // if a search filter on available_booking_types is set in the sub_search, then restrict what booking klasses you can CREATE via the diary (i.e. enquiry mode)
    qs = new SM.QueryString()
    items = $.TokenList.BuildTokensFromString(qs.get("sub_search"))
    SM.diary.restrictAvailableBookingTypes = false
    $.each(items, function(i){
      item_arr = (items[i].name) ? items[i].name.split(':') : undefined
      if (item_arr[0] == 'available_booking_types') {
        SM.diary.restrictAvailableBookingTypes = true
        SM.diary.availableBookingTypes = item_arr[1]
      }
    });
    if (SM.diary.restrictAvailableBookingTypes) {
      var a, arr, vehicle, _i, _j, _len, _len2, _ref, _ref2;
      _ref = SM.diary.vehicles;
      _len = _ref.length;
      for (_i = 0; _i < _len; _i++) {
        vehicle = _ref[_i];
        arr = [];
        _ref2 = vehicle.available_booking_types;
        _len2 = _ref2.length;
        for (_j = 0; _j < _len2; _j++) {
          a = _ref2[_j];
          if (SM.diary.availableBookingTypes.indexOf(a) !== -1) {
            arr.push(a);
          }
        }
        vehicle.available_booking_types = arr;
      }
    }
  };


  SM.diary.restrictionInRange = function(res) {
    a = SM.diary.rangesOverlap(res.from,res.to,SM.diary.settings.from,SM.diary.settings.to)
    return a
  };

  SM.diary.bookingInRange = function(booking) {
    a = SM.diary.rangesOverlap(res.from,res.to,SM.diary.settings.from,SM.diary.settings.to)
    return a
  };


  SM.diary.rangesOverlap = function(a_from,a_to,b_from,b_to) {
    return a_from <= b_to && a_to >= b_from
  }

  SM.diary.setRestriction = function(column,type) {
    if (type == "nomovement") {
      column.nomovement = true
      if (!SM.diary.settings.canSetLogisticsCapacity) column.canStartEnd = false
      column.restricted = true
      column.lbl = "Logistics to capacity"
    }
  }

  SM.diary.addRestriction = function(column,type) {
    SM.diary.restrictions.push({desc:type,type:type,from:column.start,to:column.end})
    SM.diary.setRestriction(column,type)
  }

  SM.diary.stylesForColumn = function(c) {

    m = c.start


    var styles = [];
    if (m) {
      if (m.is().weekday()) {}
      else styles.push("wkend")
      n = m.clone()
      n.clearTime()
      if (Date.today().compareTo(n)==0) {
        styles.push("today")
      }
      else if (SM.diary.settings.selectedDate.compareTo(n)==0) {
        styles.push("selected")
      }

      if (m.getDate()==1) styles.push("first")

    }
    return styles.join(" ")
  }

  SM.diary.resetDrag = function() {
    SM.diary.unliftBooking()

    SM.diary.drag = {active:false, booking:undefined, type:-1, start_x:0, start_y:0, current_x:0, current_y:0}
    //SM.diary.hideTempBookingHighlight();
  };

  SM.diary.liftBooking = function() {
    SM.diary.drag.booking.obj.addClass("lifted")
  }

  SM.diary.unliftBooking = function() {
    SM.diary.drag.booking.obj.removeClass("lifted")
  }

  SM.diary.initVehicles = function(vehicles) {
    SM.diary.vehicles = vehicles;
    var _i, _len, _ref;
    _ref = SM.diary.vehicles;
    _len = _ref.length;
    for (_i = 0; _i < _len; _i++) {
      SM.diary.vehicles[_i].idx = _i;
    }
  };


  SM.diary.fixDates = function(booking) {
    SM.diary.setBookingStart(booking,Date.parse(booking.data.start_at))
    SM.diary.setBookingEnd(booking,Date.parse(booking.data.end_at))
    booking.data.prep_start = Date.parse(booking.data.prep_start)
    booking.data.prep_end = Date.parse(booking.data.prep_end)
    SM.diary.calculateMinutesForBooking(booking)
  }


  SM.diary.initLogisticCenters = function(logistic_centers) {
    SM.diary.logistic_centers = logistic_centers;

    SM.diary.logisticsCapacity = undefined;

    if (SM.diary.settings.canSetLogisticsCapacity) {
      if (SM.diary.logistic_centers.length == 0) {
        SM.diary.logisticsCapacity = new SM.diary.LogisticsCapacityByAccount()
      }
      else if (SM.diary.settings.canSetLogisticsCapacityLimits)  {
        SM.diary.logisticsCapacity = new SM.diary.LogisticsCapacityByCenterLimits()
      }
      else {
        SM.diary.logisticsCapacity = new SM.diary.LogisticsCapacityByCenter()
      }
    }
  };


  SM.diary.getVehicleWithId = function(id) {
    var _i, _len, _ref;
    _ref = SM.diary.vehicles;
    _len = _ref.length;
    for (_i = 0; _i < _len; _i++) {
      if (SM.diary.vehicles[_i].id === id) {
        return SM.diary.vehicles[_i];
      }
    }
  };


  SM.diary.pixelsToPercentage = function(px) {
    px_updated = px - SM.diary.menu.width
    if (SM.menu && (SM.menu.hidden != SM.diary.menuHidden)) {
      SM.diary.menuHidden = SM.menu.hidden
      SM.diary.updateScaleFactors()
    }
    if (SM.menu) px_updated -= SM.menu.currentWidth();
    return px_updated/SM.diary.pixelsPerPercent
  }

  SM.diary.pixelsToDate = function(px) {
    return SM.diary.percentageToDate(SM.diary.pixelsToPercentage(px))
  }

  SM.diary.dateToPercentage = function(dt) {
    full = SM.diary.settings.to - SM.diary.settings.from
    left = dt - SM.diary.settings.from
    return (left/full)*100
  };

  SM.diary.minutesToPercentage = function(mns) {
    full = SM.diary.settings.to - SM.diary.settings.from
    left = SM.diary.settings.from.clone().add(mns).minutes() - SM.diary.settings.from
    return (left/full)*100
  }

  SM.diary.percentageToDate = function(perc) {
    full = SM.diary.settings.to - SM.diary.settings.from + 1000
    fullMins = full / 1000 / 60
    minsToAdd = perc * fullMins / 100
    return SM.diary.settings.from.clone().add(minsToAdd).minutes()
  };


  SM.diary.differenceInMinutes = function(a,b) {
    return Math.ceil((a-b)/1000/60)
  }

  SM.diary.redrawTempBooking = function() {
    SM.diary.drawBooking(SM.diary.tempBooking)
  }

  SM.diary.clearTempBooking = function() {
    SM.diary.tempBookingActive = false;
    SM.diary.tempBooking = {};
    SM.diary.hideTempBookingPanel();
    SM.diary.closeVehicle()
  }

  SM.diary.hideTempBookingPanel = function() {
    $("div.diary-booking-temp").remove();
    $("div.diary-prep-temp").remove();

  }

  SM.diary.sizeInEnglish = function(booking) {

    var s = []
    var total = booking.data.minutes
    if (SM.diary.snapToMinutes() >= SM.diary.ONE_DAY_IN_MINUTES) {
      var startOffset = moment(booking.data.start_at).utcOffset()
      var endOffset = moment(booking.data.end_at).utcOffset()
      total += (endOffset-startOffset)
    }
    n = total
    d = 0
    h = 0
    m = 0
    if (n >= 1440) {
      d = Math.floor(n / 1440)
      n = n % 1440
    }

    if (n >= 60) {
      h = Math.floor(n / 60)
      n = n % 60
    }
    if (n >= 0) {
      m = Math.floor(n)
    }
    if (d) {
      if (d==1) s.push(d + " day")
      else s.push(d + " days")
    }
    if (d < 10) {
      if (h) {
        if (h==1) s.push(h + " hr")
        else s.push(h + " hrs")
      }
      if (m) {
        if (m==1) s.push(m + " min")
        else s.push(m + " mins")
      }
    }
    s = s.join(", ")

    if (d > 365*5) {
      s = "<B>" + booking.data.start_at.toString("d MMM yyyy") + " - </B>"
    }
    else if (total > 1440*5) {
      s += " : <b>" + booking.data.start_at.toString("d MMM") + " - " + booking.data.end_at.toString("d MMM") + "</b>"
    }
    else if (total > 1440*50) {
      s += " : <b>" + booking.data.start_at.toString("d MMM yyyy") + " - " + booking.data.end_at.toString("d MMM yyyy") + "</b>"
    }
    return s
  }

  SM.diary.drawBooking = function(booking) {

    SM.diary.removeTooltips()

    start   = Date.parse(booking.data.start_at)
    end     = Date.parse(booking.data.end_at)

    if (start.compareTo(SM.diary.settings.from) == -1)  booking.startsOutside = true
    else booking.startsOutside = false;

    if (end.compareTo(SM.diary.settings.to) == 1) booking.endsOutside = true
    else booking.endsOutside = false;

    // check to see if this booking already has an object - if so - destroy it.
    existing = $("div.diary-booking[data-booking='" + booking.idx + "']")
    if (existing.size() > 0) {
      existing.remove()
    }
    existing = $("div.diary-prep[data-booking='" + booking.idx + "']")
    if (existing.size() > 0) {
      existing.remove()
    }

    vehicle = SM.diary.getVehicleWithId(booking.data.vehicle_id)

    edge_style = []
    bookingWidth = 0
    startX = 0
    less = false

    if (booking.data.status) {
      booking_status_txt = booking.data.status.toLowerCase().split(" ").join("_");
    }
    else {
      booking_status_txt = '';
    }

    booking.draggable = true;
    booking.draggableLeft = true;
    booking.draggableRight = true;

    if (booking.startsOutside)  {
      edge_style.push("starts-outside")
      booking.draggableLeft = false
    }

    if (booking.endsOutside) {
      edge_style.push("ends-outside")
      booking.draggableRight = false
    }

    if ((booking.startsOutside || booking.endsOutside) && (!booking.isTemp)) {
      booking.draggable = false
    }

    if (booking.data.has_extension_request ||
        (booking.data.extensions && booking.data.extensions.length > 0)) {
      booking.draggable = false
      booking.draggableLeft = false
    }

    if (booking.data.has_extension_request) {
      edge_style.push("extension-requested")
    }

    if (booking.blocked) {
      edge_style.push("status-blocked")
    }
    else {
      edge_style.push("status-" + booking_status_txt)
    }

    booking_css_class =  ((SM.diary.booking_class(booking) == 'Off Road')? 'blank_booking' : '')
    bookingHTML = $("<div class='diary-booking " + edge_style.join(' ') + " " + booking_css_class +
                    "' data-booking='" + booking.idx + "' data-vehicle-id='" +
                    vehicle.id + "' data-id='" + booking.data.id + "'>")

    bookingHTML_customer = ""
    bookingHTML_category_type = ""
    bookingHTML_status = ""

    bookingHTML_inner = $("<div class='diary-booking-inner' data-trigger='manual'></div>")

    bookingHTML_hotspot_left = $("<div class='hotspot left' href='javascript:void(0)' data-idx='" + booking.idx+ "'></div>")
    bookingHTML_hotspot_right = $("<div class='hotspot right' href='javascript:void(0)' data-idx='" + booking.idx + "'></div>")
    bookingHTML_hotspot_move = $("<div class='hotspot move' href='javascript:void(0)' data-idx='" + booking.idx + "'></div>")

    bookingHTML_header = $("<span class='diary-booking-header'></span>")
    bookingHTML_icon = $("<i class='diary-booking-icon fa'></i>")

    if (booking.blocked) {
      $("i",bookingHTML).addClass("icon-lock").show()
    }
    else {
      bookingHTML_customer = []
      if (booking.data.customer_name) {
        bookingHTML_customer.push(booking.data.customer_name)
      }
      if (booking.data.company_name) {
        bookingHTML_customer.push(booking.data.company_name)
      }

      bookingHTML_customer = $("<span class='diary-booking-customer'>" + bookingHTML_customer.join("<BR>") + "</span>")

      if ( booking.data.booking_type ){
        bookingHTML_category_type = $("<span class='diary-booking-type'>" + booking.data.booking_type.split("_").join(" ") + "</span>")
      }

      bookingHTML_status = "<span class='diary-booking-status'><b>" + booking.data.id + "</b> "

      if (!less) {
        bookingHTML_status += "<span class='diary-booking-status-label'>" + SM.diary.booking_class(booking) + " / " + booking.data.status.replace(/_/g," ") + "</span>"
      }

      bookingHTML_status = $(bookingHTML_status + "</span>")
    }

    bookingHTML_size = $("<span class='diary-booking-size'>" + SM.diary.sizeInEnglish(booking) + "</span>")

    bookingHTML_inner.append(bookingHTML_hotspot_left)
    bookingHTML_inner.append(bookingHTML_hotspot_right)
    bookingHTML_inner.append(bookingHTML_hotspot_move)
    bookingHTML_inner.append(bookingHTML_header)
    bookingHTML_inner.append(bookingHTML_size)

    bookingHTML_inner.append(bookingHTML_icon)

    bookingHTML.append("<div class='arrow'></div>")

    if (!booking.blocked) {
      bookingHTML_inner.append(bookingHTML_customer)
      if (!less) bookingHTML_inner.append(bookingHTML_category_type)
      bookingHTML_inner.append(bookingHTML_status)
    }


    bookingHTML.append(bookingHTML_inner)


    if (booking.data.can_add_extension) {
      bookingHTML_extension_new = $("<div class='diary-booking-extension-new'><i class='fa fa-plus-circle'></i><span class='extension-inner'></span></div>")
      bookingHTML.append(bookingHTML_extension_new)
      booking.ext = bookingHTML_extension_new
    }

    startPerc = SM.diary.dateToPercentage(booking.data.start_at)
    endPerc = SM.diary.dateToPercentage(booking.data.end_at_plus_one_second)

    widthPerc = SM.diary.minutesToPercentage(booking.data.minutes)


    if (startPerc < 0) startPerc = 0
    if (endPerc > 100) endPerc = 100
    widthPerc = endPerc - startPerc

    // bookingHTML.css("top",vehicle.idx*SM.diary.settings.rowHeight)  //parameterise height
    bookingHTML.css("left",startPerc+"%")
    bookingHTML.css("width",widthPerc+"%")

    if (!booking.draggable) {
      bookingHTML.addClass("nodrag")
    }
    if (!booking.draggableLeft) {
      bookingHTML.addClass("nodragleft")
    }
    if (!booking.draggableRight) {
      bookingHTML.addClass("nodragright")
    }


    //PREP

    booking.obj = bookingHTML


    bookingPrepHTML = ""

    if (endPerc!=100) {

      if (booking.isTemp) SM.diary.setPrepMinutes(booking)

      prepStartPerc = SM.diary.dateToPercentage(booking.data.end_at)
      prepEndPerc = SM.diary.dateToPercentage(booking.data.prep_end)

      if (prepStartPerc < 0) prepStartPerc = 0
      if (prepEndPerc > 100) prepEndPerc = 100
      prepWidthPerc = prepEndPerc - prepStartPerc

      bookingPrepHTML = $("<div class='diary-prep' data-booking='" + booking.idx + "'><span class='prep-inner'></span></div>")
      // bookingPrepHTML.css("top",vehicle.idx*SM.diary.settings.rowHeight)
      bookingPrepHTML.css("left",prepStartPerc+"%")
      bookingPrepHTML.css("width",prepWidthPerc+"%")

      booking.prep_obj = bookingPrepHTML
    }

    if (booking.isTemp) {
      bookingHTML.addClass("diary-booking-temp")
      if (bookingPrepHTML) bookingPrepHTML.addClass("diary-prep-temp")

      SM.diary.styleBookingForValidity(booking)

    }



    if (SM.diary.drag.active) SM.diary.liftBooking()


    vehicle.row.append(bookingHTML)
    vehicle.row.append(bookingPrepHTML)

    //EXTENSIONS

    if (booking.data.extensions && booking.data.extensions.length > 0) {

      bookingHTML_extensions = $("<div class='diary-booking-extensions'></div>")

      _xlen = booking.data.extensions.length
      for (_x = 0; _x < _xlen; _x++) {

        if (booking.data.extensions[_x].status == 'approved' || booking.data.extensions[_x].status == 'requested') {

          extStartPerc = SM.diary.dateToPercentage(Date.parse(booking.data.extensions[_x].start_at))
          extEndPerc = SM.diary.dateToPercentage(Date.parse(booking.data.extensions[_x].end_at))

          if (extStartPerc < 0) extStartPerc = 0
          if (extEndPerc > 100) extEndPerc = 100
          extWidthPerc = extEndPerc - extStartPerc

          bookingExtensionHTML = $("<div class='diary-booking-extension status-" + booking_status_txt + " " + booking.data.extensions[_x].status + "' data-booking='" + booking.idx + "' data-id='" + booking.data.extensions[_x].id + "'><span class='diary-booking-header'></span><span class='diary-booking-customer'>"+(booking.data.extensions[_x].reason || '')+"</span><span class='diary-booking-status'>Extension / " + booking.data.extensions[_x].status + "</span><span class='extension-inner'></span></div>")

          bookingExtensionHTML.css("left",extStartPerc+"%")

          if (booking.data.extensions[_x].status != 'approved') {
            bookingExtensionHTML.css("width",extWidthPerc+"%")
          }
          bookingHTML_extensions.append(bookingExtensionHTML)
        }

      }
      vehicle.row.append(bookingHTML_extensions)
    }



  }

  SM.diary.booking_class = function(booking) {
    if (booking.data.type) {
      booking_class = booking.data.type.replace(/Booking$/,'');
    }
    else booking_class = ""
    if ( booking_class == 'Blank' ) booking_class = 'Off Road';

    return booking_class;
  }

  SM.diary.removePrepWhilstDragging = function(booking) {
    if (booking.obj) {  //hide prep
      var row = booking.obj.parent()
      $("div.diary-prep[data-booking=" + booking.idx + "]",row).remove()
    }
  }

  SM.diary.startDrag = function(booking,drag_type,touchEvent) {

    SM.diary.activeBooking = booking;

    if (SM.diary.drag.active) SM.diary.resetDrag()

    SM.diary.drag.booking = booking
    SM.diary.drag.type = drag_type

    if (!SM.diary.drag.booking.isTemp && SM.diary.tempBookingActive) {
       SM.diary.clearTempBooking()
    }

    SM.diary.drag.active = true
    SM.diary.selectedVehicleIdx = SM.diary.selectedVehicle.idx;
    SM.diary.drag.moved = false
    SM.diary.drag.start_x = touchEvent.pageX
    SM.diary.drag.start_y = touchEvent.pageY
    SM.diary.drag.obj_x = Number(SM.diary.drag.booking.obj.position().left)
    SM.diary.drag.obj_y = Number(SM.diary.drag.booking.obj.position().top)
    SM.diary.drag.obj_width = Number(SM.diary.drag.booking.obj.width())

    SM.diary.drag.booking.data.valid = true

    SM.diary.removePrepWhilstDragging(SM.diary.drag.booking)

    if (SM.diary.backupBooking == undefined) {
      SM.diary.backupBooking = $.extend(true, {}, SM.diary.drag.booking.data);
    }

    SM.diary.drag.booking.original_vehicle_id = SM.diary.drag.booking.data.vehicle_id

    SM.diary.drag.originalSize = SM.diary.settings.defaultBookingSizeInMinutes

    SM.diary.tempBooking = $.extend(true, {}, SM.diary.drag.booking);  //backup

    SM.diary.tempBookingActive = true;


    SM.diary.styleBookingForValidity(SM.diary.drag.booking)
    SM.diary.liftBooking()

  }

  SM.diary.newBookingPlaced = function() {

    var booking = SM.diary.tempBooking

    SM.diary.backupBooking = $.extend(true, {}, SM.diary.tempBooking.data);

    //validate again with PREP
    SM.diary.validateBooking(booking,SM.diary.DO_CALC_PREP)

    if (booking.data.valid) {
      var vehicle      = SM.diary.getVehicleWithId(booking.data.vehicle_id);
      SM.diary.openVehicle()
      SM.diary.dialogue = SM.diary.BookingClassSelector({ type: booking.data.type,
                                      el: booking.obj,
                                      booking: booking,
                                      vehicle: vehicle })
      SM.diary.dialogue.show();
      SM.diary.setDatesOnForm(booking)
    }
  }

  SM.diary.extensionDrawn = function(booking) {

    SM.diary.validateBooking(booking,SM.diary.DO_CALC_PREP)

    if (booking.data.valid) {
      var vehicle      = SM.diary.getVehicleWithId(booking.data.vehicle_id);
      SM.diary.openVehicle()
      SM.diary.dialogue = SM.diary.BookingClassSelector({ type: 'Extension',
                                                     el: booking.obj,
                                                     booking: booking,
                                                     vehicle: vehicle })
      SM.diary.dialogue.show();
      SM.diary.setDatesOnForm(booking)
    }
  }


  SM.diary.setDatesOnForm = function(booking) {

    var st = booking.data.start_at.clone()
    var en = booking.data.end_at.clone()

    if (SM.diary.dialogue.hasTimes) {
      en = en.add(1).seconds()
    }

    dts = st.toString('d MMM yyyy')
    tms = st.toString('HH:mm')
    dte = en.toString('d MMM yyyy')
    tme = en.toString('HH:mm')

    $("#diary-form a.start_at").html( dts )
    $("#diary-form a.start_at_time").html( tms )
    $("#diary-form a.end_at").html( dte )
    $("#diary-form a.end_at_time").html( tme )

    SM.diary.dialogue.changing = true
    SM.diary.dialogue.changingFromDiary = true
    SM.diary.dialogue.dateTimeChanged()

    $("#diary-form .dates-label").html("For " + SM.diary.sizeInEnglish(booking))
    if (booking.data.prep_minutes>0) {
      $("#diary-form .prep-label").html("Prep for " + SM.minsToDays(booking.data.prep_minutes) + "")
    }
    else {
      $("#diary-form .prep-label").html("")
    }
  }

  SM.diary.BookingClassSelector = function(options){

    if (options.type == "DemoBooking"){
      return new SM.diary.DemoBookingDialogue(options.el, options.booking, options.vehicle, options.type)
    } else if(options.type == "FleetDemoBooking") {
      return new SM.diary.FleetDemoBookingDialogue(options.el, options.booking, options.vehicle, options.type)
    } else if(options.type == "LoanBooking") {
      return new SM.diary.LoanBookingDialogue(options.el, options.booking, options.vehicle, options.type)
    } else if(options.type == "ExperienceBooking") {
      return new SM.diary.ExperienceBookingDialogue(options.el, options.booking, options.vehicle, options.type)
    } else if(options.type == "TestDriveBooking") {
      return new SM.diary.TestDriveBookingDialogue(options.el, options.booking, options.vehicle, options.type)
    } else if(options.type == "ReplacementBooking") {
      return new SM.diary.ReplacementBookingDialogue(options.el, options.booking, options.vehicle, options.type)
    } else if(options.type == "BlankBooking") {
      return new SM.diary.BlankBookingDialogue(options.el, options.booking, options.vehicle, options.type)
    } else if(options.type == "Extension") {
      return new SM.diary.ExtensionDialogue(options.el, options.booking, options.vehicle, options.booking.data.type)
    }
  }

  SM.diary.displayErrors = function(booking) {
    if (booking.data.errors.length) {
      message = []
      var _i, _len, _ref;
      _ref = booking.data.errors;
      _len = _ref.length;
      for (_i = 0; _i < _len; _i++) {
        message.push("<li>" + booking.data.errors[_i] + "</li>");
      }
      $("#diary-form .form-errors").html(message.join("")).removeClass("hide")
    }
    else {
      $("#diary-form .form-errors").html("").addClass("hide")
    }
  }

  SM.diary.cancelBookingChange = function() {
    SM.diary.activeBooking.data = SM.diary.backupBooking
    SM.diary.calculateMinutesForBooking(SM.diary.activeBooking)
    //now redraw the booking!
    SM.diary.drawBooking(SM.diary.activeBooking)
    SM.diary.activeBooking = undefined;
    SM.diary.backupBooking = undefined;
    if (SM.diary.tempBookingActive) {
      SM.diary.clearTempBooking()
      SM.diary.unselectVehicle()
    }
  }

  SM.diary.preventDrag = function(booking) {
    var bookingTile = $("div.diary-booking[data-id='" + booking.data.id + "']");

    $("i.diary-booking-icon",SM.diary.saving.booking.obj).addClass("fa-save").show();

    booking.draggable = false;
    booking.draggableLeft = false;
    booking.draggableRight = false;

    bookingTile.addClass("nodrag");
    bookingTile.addClass("nodragright");
    bookingTile.addClass("nodragleft");
  };

  SM.diary.saveBooking = function(booking) {
    if (SM.currentUser.max_clearance_level < 17 || SM.diary.drag.booking.isTemp) {
      var changeVehicle = false
      if (booking.original_vehicle_id != booking.data.vehicle_id) changeVehicle = true

      booking_type = booking.data.type.camelToUnderscore()
      booking_path = '/' + booking_type + 's/';

      _data = []

      start_at    = SM.diary.formatDateForSaving(booking.data.start_at)
      end_at      = SM.diary.formatDateForSaving(booking.data.end_at)

      ajax_url = booking_path + booking.data.id + ".json"
      ajax_type = "PUT"

      if (changeVehicle) {
        ajax_url = booking_path + booking.data.id + "/create_booking_from_existing_booking.json"

        _data.push("vehicle_id="+booking.data.vehicle_id)
        _data.push("start_at="+start_at)
        _data.push("end_at="+end_at)

      }
      else if (booking.extending == false){
        _data.push( booking_type + "[vehicle_id]=" + booking.data.vehicle_id)
        _data.push( booking_type + "[start_at]=" + start_at)
        _data.push( booking_type + "[end_at]=" + end_at)
      }

      //don't know why i have to re-point to this object
      SM.diary.saving.booking = booking
      SM.diary.preventDrag(SM.diary.saving.booking);
      $.ajax({
        url: ajax_url,
        type: ajax_type,
        data: _data.join("&")
      }).done(function(data, textStatus, jqXHR) {
        SM.diary.saving.booking.data = data[booking_type]
        SM.diary.fixDates(SM.diary.saving.booking)

        //now redraw the booking!
        SM.diary.drawBooking(SM.diary.saving.booking)

        SM.diary.activeBooking = undefined;
        SM.diary.backupBooking = undefined;
        SM.diary.saving = {}

        SM.diary.reload()

      }).fail(function(data, textStatus, jqXHR) {
        message = ["Sorry, this change can't be made because:"," "]

        var errors = $.parseJSON(data.responseText)[booking_type + 's']

        var _i, _len;
        _len = errors.length;
        for (_i = 0; _i < _len; _i++) {
          message.push(errors[_i]);
        }

        alert(message.join("\n"))

        SM.diary.cancelBookingChange()

      });
    } else {
      SM.diary.resetDrag()
      SM.diary.cancelBookingChange()
    }
  }

  SM.diary.formatDateForSaving = function(dt) {
    return dt.toString("d MMM yyyy HH:mm:ss ") + dt.getUTCOffset()
  }

  SM.diary.scrollToSelectedVehicle = function() {
    if (SM.diary.selectedVehicle) {
      $(document.body).animate({ scrollTop: SM.diary.getOffset() - SM.diary.header.height() - 45 + Number(SM.diary.selectedVehicle.idx)*SM.diary.settings.rowHeight })
    }
  }



  SM.diary.getTouchEvent = function(e) {
    if (e.originalEvent && e.originalEvent.touches) {
      return e.originalEvent.touches[0]
    }
    else return e
  }

  SM.diary.resetEndDate = function(booking){
    end_at = booking.data.start_at.clone().add(1).minutes();
    SM.diary.setBookingEnd(booking, end_at);
  };

  SM.diary.updateBookingFromForm = function(dontParseUiDates) {
    if ($("#diary-form").size()) {
      if (!dontParseUiDates) {
        var start_dt  = Date.parse($("#diary-form .hidden_start_at").attr("value"))
        var end_dt    = Date.parse($("#diary-form .hidden_end_at").attr("value"))
        if (start_dt) {
          SM.diary.setBookingStart(SM.diary.tempBooking,start_dt)
        }
        if (end_dt) {
          SM.diary.setBookingEnd(SM.diary.tempBooking,end_dt)
        }
      }
      SM.diary.ensureMinimumSize(SM.diary.tempBooking)
      if (SM.diary.tempBooking.data.extensions.length == 0) {
        SM.diary.ensureMaximumSize(SM.diary.tempBooking)
      }
      SM.diary.setDatesOnForm(SM.diary.tempBooking)
      SM.diary.redrawTempBooking()
      SM.diary.validateBooking(SM.diary.tempBooking,SM.diary.DO_CALC_PREP)
    }
  }

  SM.diary.setBookingStart = function(booking,dt) {
    booking.data.start_at = dt;
    SM.diary.calculateMinutesForBooking(booking)
  }

  SM.diary.setBookingEnd = function (booking, dt) {
    'use strict';
    if (booking && dt) {
      booking.data.end_at = dt.clone();
      booking.data.end_at_plus_one_second = dt.clone().add(1).seconds();
      if (SM.diary.drag.active) {
        booking.data.prep_start = booking.data.end_at.clone();
        booking.data.prep_end = booking.data.end_at.clone();
      }
      SM.diary.calculateMinutesForBooking(booking);
    }
  };

  SM.diary.setPrepMinutes = function(booking) {
    booking.data.prep_minutes =
      new SM.diary.BookingTurnaroundTimeSetting(SM.diary.settings.prepPeriodInMinutes, booking.data, SM.diary.vehicles).value();
    SM.diary.calculatePrep(booking)
  }

  SM.diary.calculateMinutesForBooking = function (booking) {
    'use strict';
    if (!booking.data.end_at && booking.data.start_at) {
      booking.data.end_at = booking.data.start_at.clone();
    }
    booking.data.minutes = SM.diary.differenceInMinutes(booking.data.end_at, booking.data.start_at);
  };

  SM.diary.ensureMinimumSize = function(booking) {
    var snapMinutes = SM.diary.snapToMinutes()
    if ((SM.diary.settings.defaultBookingMinutes.length != 0) && (!( booking.data.minutes > 2))) {
      var min = new SM.diary.DefaultBookingLengthFinder(SM.diary.settings.defaultBookingMinutes, booking.data, SM.diary.vehicles).value()
    } else if ($.inArray('Can create without length limit bookings all', SM.currentUser.permissions) > -1) {
      var min = 0;
    } else {
      var min = new SM.diary.DefaultBookingLengthFinder(SM.diary.settings.minimumBookingMinutes, booking.data, SM.diary.vehicles).value()
    }
    if ((min == 0) || isNaN(min)) min = snapMinutes

    if (booking.extending) {
      min = SM.diary.differenceInMinutes(SM.diary.backupBooking.end_at,SM.diary.backupBooking.start_at) + snapMinutes
    }
    if ((booking.data.minutes < min) || (booking.data.start_at > booking.data.end_at)) {
      end_date = booking.data.start_at.clone().add(min).minutes().add(-1).seconds()
      SM.diary.setBookingEnd(booking,end_date)
    }
  }

  SM.diary.ensureMaximumSize = function(booking) {
    if ((SM.diary.settings.defaultBookingMinutes.length != 0) && (!( booking.data.minutes > 2)) && !booking.extending) {
      var max = new SM.diary.DefaultBookingLengthFinder(SM.diary.settings.defaultBookingMinutes, booking.data, SM.diary.vehicles).value()
    } else if ($.inArray('Can create without length limit bookings all', SM.currentUser.permissions) > -1 || booking.extending) {
      var max = Infinity;
    } else {
      var max = new SM.diary.DefaultBookingLengthFinder(SM.diary.settings.maximumBookingMinutes, booking.data, SM.diary.vehicles).value()
    }
    if ((max == 0) || isNaN(max)) max = Infinity;
    if (booking.data.minutes > max) {
      end_date = booking.data.start_at.clone().add(max).minutes().add(-1).seconds()
      SM.diary.setBookingEnd(booking,end_date)
    }
  }

  SM.diary.updateDragBooking = function() {
    // Allow all users to create extensions
    if (SM.diary.drag.type == SM.diary.DRAG_RIGHT && SM.diary.drag.booking.extending) {
      SM.diary.setBookingEnd(SM.diary.drag.booking,SM.diary.cursor.date.clone().add(-1).seconds())

      SM.diary.drag.booking.data.new_extension = {
        start_at: SM.diary.backupBooking.end_at.clone().add(1).seconds(),
        end_at: SM.diary.drag.booking.data.end_at
      }
    }
    // Existing bookings only editable by < 17s or everyone if it s anew booking
    else if (SM.currentUser.max_clearance_level < 17 || !SM.diary.drag.booking.data.id) {
      if (SM.diary.drag.type == SM.diary.DRAG_RIGHT) {
        SM.diary.setBookingEnd(SM.diary.drag.booking,SM.diary.cursor.date.clone().add(-1).seconds())
      }
      else if (SM.diary.drag.type == SM.diary.DRAG_LEFT) {
        SM.diary.setBookingStart(SM.diary.drag.booking,SM.diary.cursor.date)
      }
      else {
        old_minutes = SM.diary.drag.booking.data.minutes
        SM.diary.setBookingStart(SM.diary.drag.booking,SM.diary.cursor.date)
        end_date = SM.diary.drag.booking.data.start_at.clone().add(old_minutes).minutes().add(-1).seconds()
        SM.diary.setBookingEnd(SM.diary.drag.booking,end_date)
      }

      SM.diary.ensureMinimumSize(SM.diary.drag.booking)

      // If the booking has an extension, it  may have take us beyond length limit
      if (SM.diary.drag.booking.data.extensions && SM.diary.drag.booking.data.extensions.length == 0){
        SM.diary.ensureMaximumSize(SM.diary.drag.booking)
      }

      $("span.diary-booking-size",SM.diary.drag.booking.obj).html(SM.diary.sizeInEnglish(SM.diary.drag.booking))
    }
  }

  SM.diary.indefinite_end_date = function(date){
    return new Date(2030,1,1,12,0);
  }


  SM.diary.getBookingFromHotspot = function(elm) {
    var idx = Number(elm.data("idx"))
    if (idx == -1) return SM.diary.tempBooking
    else return SM.diary.bookings[idx]
  }

  SM.diary.hotspotMousedown = function(target) {

    var booking = SM.diary.getBookingFromHotspot(target)

    if (!SM.diary.selectedVehicle) {
      SM.diary.selectVehicle(SM.diary.getVehicleWithId(booking.data.vehicle_id))
    }

    if (SM.diary.activeBooking && (SM.diary.activeBooking.data.id != booking.data.id)) {
      SM.diary.cancelBookingChange()
    }

    var drag_type = undefined

    if ((booking.draggable) && (target.hasClass("move"))) {
      drag_type = SM.diary.DRAG_MOVE
      SM.diary.setCursorOffset(booking,SM.diary.LEFT)
    }
    else if ((booking.draggableLeft) && (target.hasClass("left"))) {
      drag_type = SM.diary.DRAG_LEFT
      SM.diary.setCursorOffset(booking,SM.diary.LEFT)
    }
    else if ((booking.draggableRight) && (target.hasClass("right"))) {
      drag_type = SM.diary.DRAG_RIGHT
      SM.diary.setCursorOffset(booking,SM.diary.RIGHT)
    }
    if (drag_type) {
      SM.diary.startDrag(booking,drag_type,touchEvent)
    }
  }


  SM.diary.changeVehicleOnDrag = function(y) {
    y = y + 50
    var diff = Math.floor(y / SM.diary.settings.rowHeight)
    var idx = Number(SM.diary.selectedVehicleIdx) + diff
    var newVehicle = SM.diary.vehicles[idx]
    if (newVehicle) {
      if ($.inArray(SM.diary.drag.booking.data.type, newVehicle.available_booking_types)==-1) {
      }
      else {
        SM.diary.selectVehicle(newVehicle)
      }
    }
  }

  SM.diary.popoverFormSubmission = function () {
    "use strict";
    var createButton = $('#diary-form #create_booking');
    var message = "<li>Organisation contact is empty</li>";
    if (!createButton.hasClass('disabled')) {
      createButton.removeClass("btn-primary").addClass("disabled").val("Saving...");
      $('#diary-form .form-errors').addClass('hide');
      if ($('#input_company_id') && $('#input_customer_id').val() == "") {
        $('#diary-form .form-errors').removeClass('hide').find('.message').html(message);
        createButton.addClass("btn-primary").removeClass("disabled").val("Create");
      } else {
        $("#diary-form form").submit();
      }
    }
  };

  SM.diary.bind = function() {

    SM.diary.vehicle_overdue = function(overdue){
      return (overdue === true || overdue === 'true')? 'warning' : ''
    }

    SM.diary.vehicle_accessories = function(accessories){
      return (accessories === true || accessories === 'true')? 'accessories' : ''
    }

    SM.diary.year_from_date = function(date){
      return new Date(date.getFullYear() + 10, date.getMonth(), date.getDate(), date.getHours(), date.getMinutes());
    }

    SM.diary.createTempBooking = function(vehicle,start_at) {

      SM.diary.tempBooking = $.extend(true, {}, SM.diary.holdingBooking);
      SM.diary.tempBooking.idx = -1;
      SM.diary.tempBooking.draggable = true;
      SM.diary.tempBooking.draggableLeft = true;
      SM.diary.tempBooking.draggableRight = true;
      SM.diary.tempBooking.isTemp = true;
      SM.diary.tempBooking.blocked = false;
      SM.diary.tempBooking.data = {};
      SM.diary.tempBooking.data.id = 0;
      SM.diary.tempBooking.data.valid = true;
      SM.diary.tempBooking.data.vehicle_id = vehicle.id;
      SM.diary.tempBooking.data.site_id = vehicle.site_id;
      SM.diary.tempBooking.data.events = [];
      SM.diary.tempBooking.data.events.push({})
      SM.diary.setBookingStart(SM.diary.tempBooking,start_at)
      end_at = start_at.clone().add(1).minutes()
      SM.diary.setBookingEnd(SM.diary.tempBooking,end_at)

      SM.diary.tempBooking.data.type = vehicle.available_booking_types[0]

      SM.diary.tempBooking.data.customer = {}
      SM.diary.tempBooking.data.customer.name = "";
      SM.diary.tempBooking.data.company = {}
      SM.diary.tempBooking.data.company.name = "";
      SM.diary.tempBooking.data.errors = [];
      SM.diary.tempBooking.data.warnings = [];
      SM.diary.tempBooking.data.status = "New";
      SM.diary.tempBooking.data.prep_start = end_at.clone();
      SM.diary.tempBooking.data.prep_end = end_at.clone();
      SM.diary.tempBooking.data.extensions = [];

      SM.diary.setPrepMinutes(SM.diary.tempBooking)

      return true
    }


    $(SM.diary.settings.container).on("mousemove", "div.diary-booking, div.diary-prep", function(event){

      booking_idx = Number($(this).data("booking"))
      if (booking_idx == -1) booking = SM.diary.tempBooking
      else {
        booking = SM.diary.bookings[booking_idx]
        SM.diary.canBookHere = false
      }
      v = SM.diary.getVehicleWithId(booking.data.vehicle_id)
      SM.diary.selectVehicle(v)

    });

    $(SM.diary.settings.container).on(SM.events.dblclick, "div.item", function(event){
      event.preventDefault();
      vehicle_id = $(this).data("id");
      SM.quickSearch.viewVehicle(vehicle_id, true);
    });

    $(SM.diary.settings.container).on(SM.events.dblclick, "div.diary-booking div.hotspot", function(event){
      var booking = SM.diary.getBookingFromHotspot($(this))
      if (booking && !booking.blocked) {
        document.location = "/bookings/" + booking.data.id;
      }
    });


    $(SM.diary.settings.container).on(SM.events.dblclick, "div.diary-booking-extension", function(event) {
      id = $(this).data("id")
      booking = SM.diary.bookings[Number($(this).data("booking"))]
      SM.modalOpen("/demo_bookings/" + booking.data.id + "/extensions/" + id + "/edit", function() { SM.bookings.extensionFormOpened() } )

    });

    $(SM.diary.settings.container).on(SM.events.click, "div.diary-panel .diary-scale", function(event){
      event.preventDefault();
      SM.diary.manualStateChange = true
      SM.diary.setScaling($(this).data("scale"), true)
      SM.diary.draw(SM.diary.DO_RELOAD_BOOKINGS)
    });

    $(SM.diary.settings.container).on(SM.events.click, "div.diary-panel button.diary-scale-btn", function(event){
      event.preventDefault();
    });

    $(SM.diary.settings.container).on(SM.events.click, "#diary-form #create_booking", function(event){
      event.preventDefault()
      SM.diary.popoverFormSubmission()
    });

    $(document).on(SM.events.click, "div.popover a.close", function(event){
      event.preventDefault();
      $("div.popover").remove()
    });

    $(SM.diary.settings.container).on("mouseover touchstart", "div.diary-menu-items div.item", function(event){
      SM.diary.selectVehicle(SM.diary.vehicles[$(this).index()])
      //event.preventDefault();
    });

    if(SM.iPad){
      $(SM.diary.settings.container).on(SM.events.click, '.diary-menu-items div.warning', function(event){
        // There is a toggle action, but it flickers and doesn't track state properly - so manually hide and show.
        if($('body > div.tooltip').length){
          $(this).tooltip({ trigger: 'manual' }).tooltip('hide');
        }
        else {
          $(this).tooltip({ trigger: 'manual' }).tooltip('show');
        }
      });
    }

    $(SM.diary.settings.container).on("mouseover", "div.diary-calendar-hotspots div.diary-item-hotspot", function(event){
      if (!SM.iPad) {
        touchEvent = SM.diary.getTouchEvent(event)
        SM.diary.updateCursor(touchEvent)
        SM.diary.selectVehicle(SM.diary.vehicles[$(this).index()])
      }
      SM.diary.canBookHere = true
      event.preventDefault()

    });


    $(SM.diary.settings.container).on("mousedown touchstart", "div.diary-calendar-hotspots div.diary-item-hotspot", function(event){

      touchEvent = SM.diary.getTouchEvent(event)

      SM.diary.updateCursor(touchEvent)

      SM.diary.canBookHere = true

      SM.diary.tempBookingPlaced = false

      SM.diary.selectVehicle(SM.diary.vehicles[$(this).index()])

      if (!SM.diary.settings.canCreateBookings) {
        return false
      }
      else if (SM.diary.formIsOpen) {
        //SM.diary.scrollToSelectedVehicle()
      }
      else if (SM.diary.activeBooking) {
        SM.diary.cancelBookingChange()
      }
      else if (SM.diary.tempBookingActive) {
        SM.diary.clearTempBooking()
      }
      else if (SM.diary.canBookHere && SM.diary.cursor.active) {



        ok = SM.diary.createTempBooking(SM.diary.selectedVehicle,SM.diary.cursor.date)
        if (ok) {
          SM.diary.drawBooking(SM.diary.tempBooking)
          SM.diary.tempBookingActive = true;
          SM.diary.startDrag(SM.diary.tempBooking,SM.diary.DRAG_RIGHT,touchEvent)
        }
      }

      //event.preventDefault()

    });


    $(SM.diary.settings.container).on("mousedown touchstart", "div.hotspot", function(event){

      if (SM.diary.activeBooking && !SM.diary.activeBooking.data.valid) {
        SM.diary.cancelBookingChange()
        return false
      }

      touchEvent = SM.diary.getTouchEvent(event)
      target = $(this)

      SM.diary.tempBookingPlaced = false
      SM.diary.updateCursor(touchEvent)

      SM.diary.hotspotMousedown(target)
    });

    $(SM.diary.settings.container).on("mouseup touchend", "div.diary-scale-btn-group a, #diary-form a, #diary-form input, #diary-form textarea, #diary-form button", function(event){
      if ($(this).hasClass("diary-form-close")) {
        SM.diary.closeVehicle();
      }
      return true;
    });

    //do dragging
    $(SM.diary.settings.container).on("mousemove touchmove", SM.diary.scroll, function(event) {
      touchEvent = SM.diary.getTouchEvent(event)

      if ((!SM.diary.drag.active) && (SM.diary.drag.booking)) {
        SM.diary.resetDrag()
        SM.diary.cancelBookingChange()

      }
      //event.preventDefault() - breaks scrolling on ipad if uncommented

      SM.diary.updateCursor(touchEvent)

      if (SM.diary.drag.active) {

        event.preventDefault()

        SM.diary.removeTooltips()

        SM.diary.drag.booking.extending = false

        SM.diary.closeVehicle()

        // event.preventDefault()
        SM.diary.drag.current_x = touchEvent.pageX
        SM.diary.drag.current_y = touchEvent.pageY

        xDiff = SM.diary.drag.current_x - SM.diary.drag.start_x
        yDiff = SM.diary.drag.current_y - SM.diary.drag.start_y

        if ((SM.diary.drag.booking.data.can_add_extension) && (SM.diary.drag.type == SM.diary.DRAG_RIGHT)) {
          SM.diary.drag.booking.extending = true
          if (xDiff < 0) {
            SM.diary.drag.active = false
            return false
          }
        }

        SM.diary.drag.moved = true

        SM.diary.changeVehicleOnDrag(yDiff)
        // if (navigator.userAgent.match(/iPad/i)) {
        //   event.originalEvent.targetTouches[0].target.style.webkitTransform = 'translate(' + xDiff + 'px, ' + yDiff + 'px)';
        // }

        bookingLength = SM.diary.drag.originalSize

        xMove = Math.floor((xDiff+(SM.diary.settings.blockWidth/2))/SM.diary.settings.blockWidth)
        yMove = Math.floor((yDiff+(SM.diary.settings.blockHeight/2))/SM.diary.settings.blockHeight)

        var neg
        if (SM.diary.drag.type == SM.diary.DRAG_MOVE) {
          neg = SM.diary.DO_NEGATIVE

          SM.diary.drag.new_obj_x = SM.diary.drag.obj_x + xDiff
          SM.diary.drag.new_obj_y = SM.diary.drag.obj_y + yDiff

        }
        else {
          yMove = 0
          neg = SM.diary.DONT_NEGATIVE
          if (SM.diary.drag.type == SM.diary.DRAG_LEFT) {
            bookingLength = SM.diary.drag.originalSize - xMove

            SM.diary.drag.new_obj_x = SM.diary.drag.obj_x + xDiff
            SM.diary.drag.new_obj_width = SM.diary.drag.obj_width - xDiff

          }
          else {
            bookingLength = SM.diary.drag.originalSize + xMove
            xMove = 0
            SM.diary.drag.new_obj_width = SM.diary.drag.obj_width + xDiff
          }

        }

        SM.diary.drag.booking.obj.css("left",SM.diary.drag.new_obj_x+"px")
        SM.diary.drag.booking.obj.css("top",SM.diary.drag.new_obj_y+"px")

        if (SM.diary.drag.booking.extending) {
          SM.diary.drag.booking.ext.css("width",xDiff+"px")
        }

        SM.diary.drag.booking.obj.css("width",SM.diary.drag.new_obj_width+"px")


        SM.diary.updateDragBooking()
      }
    });

    // stop dragging booking
    $(SM.diary.settings.container).on("mouseup touchend", SM.diary.scroll, function(event) {

      //touchEvent = SM.diary.getTouchEvent(event)
      //target = $(touchEvent.originalEvent.target)


      // if (!SM.diary.mouseUpLock) {

        // SM.diary.mouseUpLock = true
        SM.diary.clearCursorOffset()

        if (SM.diary.drag.active && SM.diary.drag.booking) {

          SM.diary.updateDragBooking()
          SM.diary.tempBooking = SM.diary.drag.booking

          if (SM.diary.drag.moved) {

            SM.diary.drawBooking(SM.diary.drag.booking)
            if (SM.diary.drag.booking.isTemp) {
              SM.diary.newBookingPlaced()
            }
            else if (SM.diary.drag.booking.extending) {
              SM.diary.extensionDrawn(SM.diary.tempBooking)
            }
            else {
              //save changes
              SM.diary.validateBooking(SM.diary.drag.booking,SM.diary.DO_CALC_PREP)
              if (SM.diary.tempBooking.data.valid) SM.diary.saveBooking(SM.diary.tempBooking)
              SM.diary.clearTempBooking()
            }
          }
          else if (!SM.iPad) {

            if (SM.diary.drag.booking.isTemp) {
              SM.diary.drawBooking(SM.diary.drag.booking)
              SM.diary.newBookingPlaced()
            }
          }
          SM.diary.tempBookingPlaced = true
          SM.diary.resetDrag()
        }
        else if (SM.diary.drag.booking) {
          SM.diary.resetDrag()
          SM.diary.cancelBookingChange()
        }
      // }
    });



    $(document.body).on(SM.events.click, "#diary-form a.contact-selector", function(e) {
      e.preventDefault()
      SM.contacts.selector({
        'onComplete':SM.bookings.contactSelectedFromDiary,
        'container':$("#diary-form"),
        'forceSelectEnquiry':SM.currentUser.enquiryMode
      })
    })




    $(document.body).on(SM.events.click, "#diary-form a.repairer-selector", function(e) {
      e.preventDefault()
      SM.contacts.selector({
        onComplete: SM.bookings.repairerSelectedFromDiary,
        container: $("#diary-form"),
        filter: "contact_types:$REP",
        title: 'Search for a repairer',
        allowAddContact: false,
        allowAddLocation: false
      })
    })

    $(document.body).on(SM.events.click, "#select_booking_type input", function(e) {
      typ = $(this).attr("value");
      SM.diary.tempBooking.data.type = typ;
      SM.diary.resetEndDate(SM.diary.tempBooking);
      SM.diary.setPrepMinutes(SM.diary.tempBooking)
      SM.diary.updateBookingFromForm(true);
      SM.diary.newBookingPlaced();
    })


    $(document.body).on(SM.events.click, '#indefinite input', function(e) {

      if ($(this).is(':checked')) {

        $("#diary-form div.has_ending").addClass("hidden")
        $("#diary-form div.has_no_ending").removeClass("hidden")
        SM.diary.tempBooking.data.old_end_at = SM.diary.tempBooking.data.end_at.clone()
        SM.diary.setBookingEnd(SM.diary.tempBooking,Date.parse(SM.diary.indefinite_end_date()))
      }
      else {
        $("#diary-form div.has_ending").removeClass("hidden")
        $("#diary-form div.has_no_ending").addClass("hidden")
        SM.diary.setBookingEnd(SM.diary.tempBooking,SM.diary.tempBooking.data.old_end_at.clone())
      }
      SM.diary.redrawTempBooking()
      SM.diary.setDatesOnForm(SM.diary.tempBooking)
    })




    $(window).on("scroll", function(event) {

      SM.diary.lastScrollTop = Number($(this).scrollTop())
      SM.diary.removeTooltips()

      fixedX = SM.diary.menu.width;
      if (SM.menu) fixedX += SM.menu.currentWidth()
      fixedW = $(document.body).width() - fixedX

      breadcrumbHeight = $('#sm-body > div.row-fluid > div.breadcrumb').outerHeight() || 0
      headerHeight = $('#sm-header').outerHeight() || 0
      offset = breadcrumbHeight + headerHeight
      triggerDistance = $('.diary-inner').offset().top - offset

      if (SM.diary.lastScrollTop < triggerDistance)  {
        SM.diary.settings.container.removeClass("fixed")
        $("body").removeClass("diary-fixed")
        SM.diary.header.css("left", "")
        SM.diary.header.css("width", "")
        SM.diary.header.css("top", "auto")
        SM.diary.panel.css("top", "auto")
      }
      else {
        SM.diary.settings.container.addClass("fixed")
        $("body").addClass("diary-fixed")
        SM.diary.header.css("left", fixedX + "px")
        SM.diary.header.css("width", fixedW + "px")
        SM.diary.header.css("top", offset + "px")
        SM.diary.panel.css("top", offset + "px")
      }
    })

    var diaryFormSelector = "form[id$='_booking'], form[id$='new_extension']"
    // Unbind end then bind events as this may get called multiple times
    $(document.body).off("ajax:error", diaryFormSelector).on("ajax:error", diaryFormSelector, function (xhr, data, error) {

      if (data.status === 422) {

        var errors = [], message = [];

        var extension = $(this).attr("id") == "new_extension"

        $.each( $.parseJSON(data.responseText), function( key, value ){
          if (extension) {
            errors.push(key + " " + value.join(", "))
          }
          else {
            if( key.match(/_bookings$/) ){
              errors = value
            }
          }
        });


        var _i, _len;
        _len = errors.length;
        for (_i = 0; _i < _len; _i++) {
          message.push("<li>" + errors[_i] + "</li>");
        }

        $('#diary-form .form-errors').removeClass('hide').find('.message').html(message.join(''))
        $("#diary-form #create_booking").addClass("btn-primary").removeClass("disabled").val("Create")
      };
    });


    // Unbind end then bind events as this may get called multiple times
    $(document.body).off("ajax:success", diaryFormSelector).on("ajax:success", diaryFormSelector, function (evt, data, status, xhr) {
      if (xhr.status === 201)  {

        var new_booking = $.extend(true, {}, SM.diary.holdingBooking);

        // Not really sure what type of booking we are expecting back - take the first thing we find.
        new_booking.data = SM.bookings.data_without_root_node(data)

        SM.diary.clearTempBooking()
        SM.diary.activeBooking = undefined;
        SM.diary.backupBooking = undefined;
        // fix date formats
        SM.diary.fixDates(new_booking)
        new_booking.blocked = false
        new_booking.draggable = true
        new_booking.draggableLeft = true
        new_booking.draggableRight = true
        if(this.id != 'new_extension'){
          SM.diary.bookings.push(new_booking)
        }
        new_booking.idx    = SM.diary.bookings.length - 1;
        SM.diary.drawBooking(new_booking)

        var warnings = new_booking.data.warnings
        if (warnings) {
          message = ["Warning"," "];
          var _i, _len;
          _len = warnings.length;
          for (_i = 0; _i < _len; _i++) {
            message.push(warnings[_i]);
          }
          if ($.inArray('Can book on capacity days bookings all', SM.currentUser.permissions) === -1) {
            alert (message.join("\n"))
          }
        }

        $("#diary-form #create_booking").addClass("btn-primary").removeClass("disabled").val("Create")

      }
      SM.diary.closeVehicle()

    });

    $( window ).resize(function() {
      SM.diary.updateScaleFactors()
    });


    // if (SM.diary.first_load) {
    //   SM.diary.first_load = false
    //   setTimeout(function() {
    //     $("#search").keyup()
    //   }, 1000);
    // }

  };

})(window);
