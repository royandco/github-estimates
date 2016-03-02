var injecting = false;
var parsing = false;

var values = [
	1,2,3,4,5,10,15,20,25,30,35,40,45,50,100,150,200,300,400,500
];

var multiplier = 15;

$(document).on('DOMSubtreeModified',function() {
	if($('#partial-discussion-sidebar').length > 0 && $('.sidebar-estimate').length == 0 && !injecting) {
		injecting = true;
		$.get(chrome.extension.getURL('/menu.html'),function(data) {
			var $estimateMenu = $(data);

			var est = parseComments();
			if(est !== undefined) {
				if(values.indexOf(est) < 0) {
					values.push(est);
					values.sort(function(a,b) {
						return a - b;
					});
				}
			}

			for(var i=0;i<values.length;i++) {
				var value = values[i];
				var $html = generateValueHTML(value);
				$html.on('click',updateEstimate);
				$estimateMenu.find('.estimate-value-list').append($html);
			}

			if(est !== undefined) {
				$estimateMenu.find('.estimate-value').text(prettyEstimate(est));
				$estimateMenu.find('.estimate-value-list [data-estimate-value="' + est + '"]').addClass('selected');
			}

			$estimateMenu.insertAfter('#partial-discussion-sidebar .sidebar-assignee');
			injecting = false;
		});
	}

	if(/^https:\/\/github.com\/(.*)\/(.*)\/issues$/ig.test(document.location.href)) {
		parsing = true;
		renderOverview();
	}
});

$('.js-issue-row').each(function() {
	var issueID = $(this).attr('id').replace('issue_','');
	var issueURL = getRepoURL() + '/issues/' + issueID;
	var _self = this;

	$.get(issueURL,function(data) {
		var $comments = $(data).find('div[id^="issuecomment-"]');
		var estimate = undefined;

		$comments.each(function() {
			var text = $(this).find('.comment-content .comment-body').text();
			if(/--ROYCO_ESTIMATE--/.test(text)) {
				var matches = text.match(/ESTIMATE=([0-9]+)/);
				if(matches !== null) {
					estimate = parseInt(matches[1]);
				}
			}
		});

		if(estimate !== undefined) {
			$.get(chrome.extension.getURL('overview.html'),function(data) {
				data = data.replace(/\{estimate\}/ig,prettyEstimate(estimate));
				$(data).appendTo($(_self).find('.issue-title'));
			});
		}
	});
});

$($('.js-discussion')[0]).on('DOMNodeInserted',function(e) {
	if(!$(e.target).hasClass('js-comment-container')) return;

	updateEstimates();
});

$($('.js-discussion')[0]).on('DOMNodeRemoved',function(e) {
	if(!$(e.target).hasClass('js-comment-container')) return;

	var id = $(e.target).find('.timeline-comment').attr('id').replace('issuecomment-','');
	$('#event-' + id).remove();
});

function generateValueHTML(val) {
	return $('<div class="select-menu-item js-navigation-item" role="menuitem" data-estimate-value="' + val + '"><svg aria-hidden="true" class="octicon octicon-check select-menu-item-icon" height="16" role="img" version="1.1" viewBox="0 0 12 16" width="12"><path d="M12 5L4 13 0 9l1.5-1.5 2.5 2.5 6.5-6.5 1.5 1.5z"></path></svg><div class="select-menu-item-text">' + val + '</div></div>');
}

function updateEstimate() {
	var val = $(this).data('estimate-value');

	$('.estimate-value').text(prettyEstimate(val));

	createComment(val);
}

function prettyEstimate(estimate) {
	var pdate = prettyDate(estimate * multiplier);

	var date = '';

	if(pdate.days > 0) {
		date += pdate.days + ' day';
		if(pdate.days != 1) date += 's';
	}

	if(pdate.hours > 0) {
		if(date.length > 0) date += ', ';
		date += pdate.hours + ' hour';
		if(pdate.hours != 1) date += 's';
	}

	if(pdate.minutes > 0) {
		if(date.length > 0) date += ', ';
		if(pdate.days > 0 && pdate.hours == 0) date += '0 hours, ';
		date += pdate.minutes + ' minute';
		if(pdate.minutes != 1) date += 's';
	}

	return estimate + ' (' + date + ')';
}

function parseComments(newhtml) {
	if(newhtml === undefined) {
		var $comments = $('div[id^="issuecomment-"]');
	} else {
		var $comments = $(newhtml).find('div[id^="issuecomment-"]');
	}
	var estimate = undefined;
	$comments.each(function() {
		var text = $(this).find('.comment-content .comment-body').text();
		if(/--ROYCO_ESTIMATE--/.test(text)) {
			var matches = text.match(/ESTIMATE=([0-9]+)/);
			if(matches !== null) {
				estimate = parseInt(matches[1]);
				$(this).parent().hide();

				var _self = this;

				if($('#event-' + $(_self).attr('id').replace('issuecomment-','')).length == 0) {
					$.get(chrome.extension.getURL('event.html'),function(data) {
						var avatar = $(_self).parent().find('img.timeline-comment-avatar');
						var vars = {
							avatarAlt: avatar.attr('alt'),
							avatarSrc: avatar.attr('src'),
							username: avatar.attr('alt').replace('@',''),
							estimate: prettyEstimate(estimate),
							eventID: $(_self).attr('id').replace('issuecomment-','')
						}

						data = data.replace(/\{avatarAlt\}/gi,vars.avatarAlt).replace(/\{avatarSrc\}/gi,vars.avatarSrc).replace(/\{username\}/gi,vars.username).replace(/\{estimate\}/gi,vars.estimate).replace(/\{eventID\}/gi,vars.eventID);
						$(data).insertBefore($(_self).parent());
					});
				}
			}
		}
	});

	return estimate;
}

function deleteComments() {
	var $comments = $('div[id^="issuecomment-"]');

	$comments.each(function() {
		var text = $(this).find('.comment-content .comment-body').text();
		if(/--ROYCO_ESTIMATE--/.test(text)) {
			var matches = text.match(/ESTIMATE=([0-9]+)/);
			if(matches !== null) {
				var data = {
					'utf8': $(this).find('.js-comment-delete').find('input[name="utf8"]').val(),
					'authenticity_token': $(this).find('input[name="authenticity_token"]').val(),
					'_method': $(this).find('input[name="_method"]').val()
				};

				var commentID = $(this).attr('id').replace('issuecomment-','');
				$('#event-' + commentID).remove();

				var _self = this;

				$.post(getRepoURL() + '/issue_comments/' + commentID,data,function(res) {
					$(_self).parent().remove();
				});
			}
		}
	});
}

function updateEstimates(res) {
	var estimate = parseComments(res);

	$('.estimate-value-list .selected').removeClass('selected');
	$('.estimate-value-list [data-estimate-value="' + estimate + '"]').addClass('selected');

	$('.estimate-value').text(prettyEstimate(estimate));
}

function createComment(val) {
	var comment = '--ROYCO_ESTIMATE--\nESTIMATE=' + val;
	deleteComments();

	var data = {
		'utf8': $('.js-new-comment-form').find('input[name="utf8"]').val(),
		'authenticity_token': $('.js-new-comment-form').find('input[name="authenticity_token"]').val(),
		'issue': $('.js-new-comment-form').find('input[name="issue"]').val(),
		'comment[body]': comment
	};

	$.post(getRepoURL() + '/issue_comments',data,function(res) {
		updateEstimates(res);
	});
}

function prettyDate(minutes) {
	var minutes = minutes;
	var hours = 0;
	var days = 0;

	while(minutes >= 60) {
		hours++;
		minutes -= 60;
	}

	while(hours >= 24) {
		days++;
		hours -= 24;
	}

	return {
		minutes: minutes,
		hours: hours,
		days: days
	};
}

function getRepoURL() {
	var url = document.location.href.replace('https://github.com/','');

	var parts = url.split('/');

	var finalURL = 'https://github.com/' + parts[0] + '/' + parts[1];

	return finalURL;
}

function renderOverview() {
	if($('.pagehead').find('.estimates-rendered').length > 0) return;
	$('.pagehead').append('<div class="estimates-rendered"></div>');
	var total = 0;
	$('.js-issue-row').each(function() {
		var issueID = $(this).attr('id').replace('issue_','');
		var issueURL = getRepoURL() + '/issues/' + issueID;
		var _self = this;

		$.get(issueURL,function(data) {
			var $comments = $(data).find('div[id^="issuecomment-"]');
			var estimate = undefined;

			$comments.each(function() {
				var text = $(this).find('.comment-content .comment-body').text();
				if(/--ROYCO_ESTIMATE--/.test(text)) {
					var matches = text.match(/ESTIMATE=([0-9]+)/);
					if(matches !== null) {
						estimate = parseInt(matches[1]);
						total += estimate;
					}
				}
			});

			if(estimate !== undefined && $(_self).find('.issue-estimate').length == 0) {
				$.get(chrome.extension.getURL('overview.html'),function(data) {
					data = data.replace(/\{estimate\}/ig,prettyEstimate(estimate));
					$(data).appendTo($(_self).find('.issue-title'));
				});
			}

			if($('.states').find('.estimates-total').length == 0) {
				$('.states').append('<span class="estimates-total" style="margin-left: 10px; color: #767676;"><svg style="margin-right: 5px;" aria-hidden="true" class="octicon octicon-circle-stopwatch" role="img" version="1.1" viewbox="0 0 512 512" height="16" width="16"><path d="M256,96C141.125,96,48,189.125,48,304s93.125,208,208,208s208-93.125,208-208S370.875,96,256,96z M272,479.188V464  c0-8.844-7.156-16-16-16s-16,7.156-16,16v15.188C155.719,471.531,88.438,404.281,80.813,320H96c8.844,0,16-7.156,16-16  s-7.156-16-16-16H80.813C88.438,203.719,155.719,136.438,240,128.813V144c0,8.844,7.156,16,16,16s16-7.156,16-16v-15.188  c84.281,7.625,151.531,74.906,159.188,159.188H416c-8.844,0-16,7.156-16,16s7.156,16,16,16h15.188  C423.531,404.281,356.281,471.531,272,479.188z M208,48V16c0-8.844,7.156-16,16-16h64c8.844,0,16,7.156,16,16v32  c0,8.844-7.156,16-16,16v18.563C277.5,81.063,266.875,80,256,80s-21.5,1.063-32,2.563V64C215.156,64,208,56.844,208,48z   M394.031,127.938C377.531,115,359.25,104.281,339.5,96.313c0.313-0.75,0.375-1.563,0.781-2.313l16-27.688  c4.438-7.688,14.219-10.313,21.875-5.875l27.688,16c7.656,4.438,10.281,14.188,5.875,21.875l-16,27.688  C395.281,126.781,394.563,127.25,394.031,127.938z M394.563,224c4.438,7.656,1.813,17.438-5.844,21.875L264,317.844  c-2.469,1.438-5.25,2.156-8,2.156s-5.531-0.719-8-2.156l-124.688-71.969c-7.688-4.438-10.313-14.219-5.875-21.875  s14.219-10.281,21.875-5.875L256,285.531l116.719-67.406C380.406,213.75,390.188,216.375,394.563,224z"></path></svg><span class="total"></span></span>');
			}

			if(total > 0) {
				$('.estimates-total .total').text(prettyEstimate(total));
			}
		});
	});
}