/* глобальные переменные */
var lastPos = 0;
var mainCalendarInited = 0;
var studentCalendarInited = 0;
var googleCalendarApiKey = 'AIzaSyCE2MU7ZP0jhWgiVS9ORXCqna1Taj7w_h4';

/*
 * подобрать высоту заголовка окна подробностей
 * и иконки закрытия окна подробностей
 */
function formatHeader() {
	var titleEvent = $('#event-info h3.header');
	var btnClose = $('a.close');

	$(btnClose).outerHeight(32);

	var titleEventHeight = $(titleEvent).outerHeight();
	var btnCloseHeight = $(btnClose).outerHeight();

	var resHeight = titleEventHeight < btnCloseHeight ? btnCloseHeight : titleEventHeight;

	$(btnClose).outerHeight(resHeight);

	return;
}

/*
 * добавить лидирующий ноль к времени в UTC-формате
 */
function addZero(i) {
	if (i < 10) {
		i = "0" + i;
	}
	return i;
}

/*
 * выести окно подробностей под позицией курсора
 */
jQuery.fn.underCursor = (function(event) {
	this.css("position", "absolute");
	this.css("display", "inline");

	/* event-oriented coords */
	this.css("top", event.clientY + topOffset);
	this.css("left", event.clientX - calendarOffset.left);

	return this;
});

/*
 * вывести окно подробностей по центру календаря
 */
jQuery.fn.center = (function() {
	this.css("position", "absolute");

	/* replace for csu.ru */
	var top = $('.fc-view-container').outerHeight() - $(this).outerHeight() / 2 + "px";
	//var top = ($('.fc-view-container').outerHeight() - $(this).outerHeight()) / 2 + "px";
	var left = ($('.fc-view-container').outerWidth() - $(this).outerWidth()) / 2 + "px";

	this.css("top", top);
	this.css("left", left);

	return this;
});

/*
 * вывести окно подробностей по центру календаря
 */
jQuery.fn.center_relative = (function(parentElementSelector) {
	this.css("position", "absolute");

	var parentElementPosition = $(parentElementSelector).position();

	/* replace for csu.ru */
	var top = parentElementPosition.top + ($('.fc-view-container').outerHeight() - $(this).outerHeight()) / 2 + "px";
	var left = parentElementPosition.left + ($('.fc-view-container').outerWidth() - $(this).outerWidth()) / 2 + "px";

	this.css("top", top);
	this.css("left", left);

	return this;
});

/*
 * получить данные из станартного календаря sharepoint
 */
function retreiveStandartCalendarDataVti() {
	var url = "http://www.csu.ru/_vti_bin/ListData.svc/Calendar";
	var eventData = {
		events : []
	};
	$.ajax({
		type : "get",
		dataType : "json",
		url : url,
		headers : {
			"ACCEPT" : "application/json;odata=verbose"
		},
		error : function() {
			return null;
		},
		success : function(doc) {
			$.each(doc.d.results, function(i, e) {
				var description = $(this).attr('КатегорияValue') == null ? "" : "{cat:}{" + $(this).attr('КатегорияValue') + "}";
				description += $(this).attr('Расположение') == null ? "" : "{loc:}{" + $(this).attr('Расположение') + "}";
				description += $(this).attr('Описание') == null ? "" : "{descr:}{" + $(this).attr('Описание') + "}";

				eventData.events.push({
					title : $(this).attr('Название'),
					start : $(this).attr('ВремяНачала'),
					end : $(this).attr('ВремяОкончания'),
					description : description
				});
			});

			$('#main-calendar').fullCalendar('addEventSource', eventData);
		}
	});
}

function retreiveStandartCalendarDataApi(url, old_results) {
	var url = url;
	var eventData = {
		events : []
	};

	if (url != undefined || url != null) {
		$.ajax({
			type : "get",
			dataType : "json",
			url : url,
			headers : {
				"ACCEPT" : "application/json;odata=verbose"
			},
			error : function() {
				return null;
			},
			success : function(doc) {
				var results = doc.d.results;
				if (old_results != null)
					results = results.concat(old_results);
				retreiveStandartCalendarDataApi(doc.d.__next, results);
			}
		});
	} else {
		var results = old_results;
		$.each(results, function(i, e) {
			
			var description = $(this).attr('Category') == null ? "" : "{cat:}{" + $(this).attr('Category') + "}";
			description += $(this).attr('Location') == null ? "" : "{loc:}{" + $(this).attr('Location') + "}";
			description += $(this).attr('Description') == null ? "" : "{descr:}{" + $(this).attr('Description') + "}";
			description += $(this).attr('URL_x002d__x0430__x0434__x0440__') == null ? "" : "{url:}{" + $(this).attr('URL_x002d__x0430__x0434__x0440__').Url +"}";

			var startDateString = $(this).attr('EventDate');
			var endDateString = $(this).attr('EndDate');
			
			// устанавливаем локаль на Екатеринбург
			moment.tz.setDefault("Asia/Yekaterinburg");
			
			var startDate = moment(startDateString, 'YYYY-MM-DD HH:mm:ss Z');
			var endDate = moment(endDateString, 'YYYY-MM-DD HH:mm:ss Z');
			
			eventData.events.push({
				title : $(this).attr('Title'),
				start : startDate,
				end : endDate,
				description : description,
				ignoreTimezone : false,
				allDay : startDate.hours() == 0 || startDate.hours() == 1
			});
		});
		$('#main-calendar').fullCalendar('addEventSource', eventData);
	}
}

/*
 * установить значение поля по маркеру в окне подробностей
 */
function setFieldValue(event, marker, paramName) {
	var markerPos = 0;

	if (( markerPos = event.description.indexOf(marker)) >= 0) {
		/* устанавливаем текст */
		var selector = '#event-info .info .' + paramName + '-outp';
		
		var text = event.description.slice(markerPos + marker.length + 1, event.description.indexOf("}", markerPos + marker.length));
		
		if(paramName == "url") {
			var innerText = $(selector)[0];
			innerText.innerHTML = '<a href="' + text + '">' + innerText.innerText + "</a>";
		} else {
			$(selector).text(text);
		}
		
		/* видимость строки - видна */
		var selector = '#event-info .info .ei-' + paramName + '-row';
		$(selector).css('display', '');
	} else {
		/* видимость строки - скрыта */
		var selector = '#event-info .info .ei-' + paramName + '-row';
		$(selector).css('display', 'none');
	}
}

function bindMainCalendarMouseover(target_items, name) {

		$(target_items).each(function(i)
		{
			var my_tooltip;
			
			$(this).mouseover(function(){
				$("body").append("<div class='"+name+"' id='"+name+i+"'><p>"+this.firstChild.innerText +"</p></div>");
			 	my_tooltip = $("#"+name+i);
				my_tooltip.css({opacity:0.8, display:"none"}).fadeIn(50);
			}).mousemove(function(kmouse){
				my_tooltip.css({left:kmouse.pageX+15, top:kmouse.pageY+15});
			}).mouseout(function(){
				my_tooltip.fadeOut(50);
			});
		});
		
}


$(document).ready(function() {

	/*
	 * обработка главного календаря событий
	 */
	var mainCalendar = $('#main-calendar');
	if (mainCalendar.length > 0 && mainCalendarInited == 0) {

		$(" #event-info > .close").click(function(event) {
			lastPos = 0;
			$(" .fc-view-container ").css('background-color', '#fff');
			$(" .fc-view-container ").css('opacity', '1');
			$(" #event-info ").fadeOut();
		});

		$('#main-calendar').fullCalendar({		
			eventClick : function(event, jsEvent, view) {
				lastPos = 0;
				$(" .fc-view-container ").css('background-color', '#aaa');
				$(" .fc-view-container ").css('opacity', '.30');

				$(" #event-info .header ").text(event.title);

				/* категория */
				setFieldValue(event, "{cat:}", "category");

				/* место проведения */
				setFieldValue(event, "{loc:}", "location");

				/* описание */
				setFieldValue(event, "{descr:}", "description");
				
				/* ссылка */
				setFieldValue(event, "{url:}", "url");

				/* время проведения */			
				if(event._start != null) {
					var startDate = event._start;
				} else {
					var startDate = null;
				}
				
				if(event.allDay == true && event._end == null) {
					var endDate = null;
				} else {
					var endDate = event._end;
					
					/* одна дата (событие целый день, событие в течение дня) */
					var startTimeDescr = startDate.format('HH:mm');
					var endTimeDescr = endDate.format('HH:mm');
				}
				
				if(startDate == null && endDate == null) {
					$(" #event-info .info .ei-time-row ").hide();
					$(" #event-info .info .ei-date-row ").hide();
				} else {
					$(" #event-info .info .ei-time-row ").show();
					$(" #event-info .info .ei-date-row ").show();
					
					/* устанавливаем время */
					if(endDate == null || startDate.hours() == 0) {
						$(" #event-info .info .ei-time-row ").hide();
					} else {
						$(" #event-info .info .ei-time-row ").show();
						$(" #event-info .info .ei-time-row .time-outp ").text(startTimeDescr + " - " + endTimeDescr);
					} 
					
					/* событие в течение одного дня */
					if(	endDate == null || 
						startDate.get('year') == endDate.get('year') && 
						startDate.get('month') == endDate.get('month') &&
						startDate.get('date') == endDate.get('date')) {
						
						var startDateDescr = startDate.format('DD.MM.YYYY');
						$(" #event-info .info .ei-date-row .date-outp").text(startDateDescr);
						
					} else {
						var startDateDescr = startDate.format('DD.MM.YYYY');
						var endDateDescr = endDate.format('DD.MM.YYYY');
						
						$(" #event-info .info .ei-date-row .date-outp").text(startDateDescr + " - " + endDateDescr);
						$(" #event-info .info .ei-date-row .date-outp").show();
					}
				}

				$(" #event-info ").center_relative('.fc-view-container');
				$(" #event-info ").fadeIn();

				formatHeader();

				return false;
			},
			header : {
				left : 'today prev,next',
				right : 'title',
				center : 'basicDay,basicWeek,month'
			},
			weekends : true,
			weekNumbers : true,
			timeFormat : 'HH:mm',
			lang : 'ru',
			timezone : 'false',
			displayEventTime : true,
			displayEventEnd : true
		});
		mainCalendarInited = 1;
		retreiveStandartCalendarDataApi("http://example.ru/_api/Web/Lists/GetByTitle('calendar')/Items", null);
	}

	/*
	 * обработка календаря событий студентов
	 */
	var studentCalendar = $('#student-calendar');
	if (studentCalendar.length > 0 && studentCalendarInited == 0) {

		var calendarId = $('#hidden_calendarSource').val();

		$(" #event-info > .close").click(function(event) {
			$(" .fc-view-container ").css('background-color', '#fff');
			$(" .fc-view-container ").css('opacity', '1');

			$(" #event-info ").fadeOut();

		});

		$('#student-calendar').fullCalendar({
			googleCalendarApiKey : googleCalendarApiKey,
			events : calendarId,

			eventClick : function(event, jsEvent, view) {
				$(" .fc-view-container ").css('background-color', '#aaa');
				$(" .fc-view-container ").css('opacity', '.30');

				$(" #event-info .header ").text(event.title);
				$(" #event-info .info .academic-outp ").text(event.description.slice(0, (event.description.indexOf("|"))));
				$(" #event-info .info .location-outp ").text(event.location);

				var type = event.description.substring(event.description.indexOf("|") + 2);
				type = type == "Обычное" ? "" : type;

				if (type == "") {
					$(" .event-type-row ").css('display', 'none');
				} else {
					$(" .event-type-row ").css('display', '');
					$(" #event-info .info .type-outp ").text(type);
				}

				$(" #event-info .info .time-outp ").text(event._start._d.toLocaleTimeString() + " - " + event._end._d.toLocaleTimeString());

				$(" #event-info ").center();
				$(" #event-info ").fadeIn();
				formatHeader();

				return false;
			},
			header : {
				left : 'today prev,next',
				right : 'title',
				center : 'basicDay,basicWeek,month'
			},
			weekends : true,
			weekNumbers : true,
			timeFormat : 'HH:mm',
			lang : 'ru',
			timezone : 'local',
			displayEventTime : true,
			displayEventEnd : true
		});
	}
});
