var TeamModel = Backbone.Model.extend({
	initialize: function() {
		this.set("score", 0);
		this.set("active", false);
		this.set("strikes", 0);
		this.set("steal", false);
	},
	addToScore: function (points) {
		this.set("score", this.get("score") + points);
	},
	isActive: function () {
		return this.get("active");
	},
	addStrike: function () {
		this.set("strikes", this.get("strikes") + 1);
		$(".strikes").show();
		var strikes = this.get("strikes");
		for(i = 1; i <= strikes; i++){
			$("#strike-"+i).show();
		}
		document.getElementById("strike-sound").play();
		setTimeout(function(){
			for(i = 1; i <= strikes; i++){
				$("#strike-"+i).hide();
				$(".strikes").hide();
			}
		}, 1500);
		if(this.get("strikes") == 3){
			this.trigger("strikeout");
			this.set("strikes", 0);
		}
	},
	isStealing: function() {
		return this.get("steal");
	}
});

var TeamView = Backbone.View.extend({
	initialize: function() {
		this.model.on("change:score", this.render, this);
		this.model.on("change:active", this.toggleActive, this);
	},
	tagName: "div",
	boardSide: "left",
	template: _.template('<div class="team" id="team-<%= id %>"><div class="team-score"><%= score %></div><div class="team-name" style="background-color:<%= color %>"><%= name %></div></div>'),
	innerTemplate: _.template('<div class="team-score"><%= score %></div><div class="team-name" style="background-color:<%= color %>"><%= name %></div>'),
	render: function() {
		if($("#team-"+this.model.id).length){
			$("#team-"+this.model.id).html(this.innerTemplate(this.model.attributes));
		}else{
			$(".team-scores."+this.boardSide).append(this.template(this.model.attributes));
		}
	},
	toggleActive: function() {
		if(this.model.isActive()){
			$("#team-"+this.model.id).addClass("active");
		}else{
			$("#team-"+this.model.id).removeClass("active");
		}
	}
});

var SurveyView = Backbone.View.extend({
	className: "survey-wrapper",
	score: 0,
	surveys: null,
	activeSurveyId: null,
	flippedAnswers: 0,
	pickSurvey: function(survey_id) {
		if(survey_id == undefined){
			if(this.activeSurveyId == null){
				this.activeSurveyId = 0;
			}else if(this.activeSurveyId < this.surveys.length - 1){
				this.activeSurveyId++;
			}else{
				this.activeSurveyId = 0;
			}
		}else{
			this.activeSurveyId = survey_id;
		}
	},
	questionTemplate: _.template('<h3 class="survey-question"><% print(rank+" - "+question) %></h3>'),
	answerTemplate: _.template('<%= answer %> - <%= points %>'),
	render: function(){
		var activeSurvey = this.surveys[this.activeSurveyId];
		$(".answer").flip(false);
		$(".answer").one("click", $.proxy(this.flipAnswer, this));
		$(".survey").html(this.questionTemplate({
			question: activeSurvey.question,
			rank: this.activeSurveyId
		}));
		_.each(activeSurvey.answers, this.renderAnswer, this);
		$(".score").html("0");
	},
	renderAnswer: function(answer, rank) {
		$("#answer-"+(rank+1)+" .back").html(this.answerTemplate(answer));
	},
	flipAnswer: function(e) {
		$(e.currentTarget).flip(true);
		document.getElementById("clang-sound").play();
		var activeSurvey = this.surveys[this.activeSurveyId];
		var activeAnswer = e.currentTarget.id.substr(-1) - 1;
		this.updateScore(activeSurvey.answers[activeAnswer].points);
		this.flippedAnswers++;
		if(this.flippedAnswers == activeSurvey.answers.length){
			this.trigger("complete", this.score);
		}
	},
	updateScore: function(points) {
		this.score = this.score + points;
		$(".score").html(this.score);
	},
	resetScore: function() {
		this.score = 0;
		this.flippedAnswers = 0;
		$(".answer").off("click", $.proxy(this.flipAnswer, this));
		$(".score").html(this.score);
	}
});

$(document).ready(function (){
	var game_data = new QueryData(location.search, true);
	var teams = [];
	if(game_data.tn.length % 2){
		var team_half = (game_data.tn.length + 1)/2;
	}else{
		var team_half = game_data.tn.length/2;
	}
	for(i = 0; i < game_data.tn.length; i++){
		var tm = new TeamModel({
			id: i + 1,
			name: game_data.tn[i],
			color: game_data.tc[i]
		});
		if(i + 1 <= team_half){
			var board_side = "left";
		}else {
			var board_side = "right";
		}
		var teamid = i+1;
		teamid = teamid.toString();
		teams[i] = new TeamView({
			id: "team-"+teamid,
			model: tm
		});
		teams[i].boardSide = board_side;
		teams[i].render();
	}
	_.each(teams, function(team, team_id) {
		team.model.on("strikeout", function(){
			team.model.set("active", false);
			if(team_id+1 < teams.length){
				teams[team_id+1].model.set("active", true);
				teams[team_id+1].model.set("steal", true);
			}else{
				teams[0].model.set("active", true);
				teams[0].model.set("steal", true);
			}
		});
	});
	teams[0].model.set("active", true);
	
	$(".survey-wrapper .answer").flip({trigger: "manual", axis: "x"});
	
	var survey = new SurveyView();
	survey.surveys = survey_data;
	survey.pickSurvey(0);
	survey.render();
	
	survey.on("complete", function(score){
		var active_team = _.find(teams, function(team) {
			return team.model.isActive();
		});
		active_team.model.addToScore(score);
		if(!active_team.model.isStealing()){
			active_team.model.set("active", false);
			active_team.model.set("strikes", 0);
			var team_view_id = active_team.model.id - 1;
			if(team_view_id + 1 > teams.length - 1) {
				teams[0].model.set("active", true)
			}else{
				teams[team_view_id + 1].model.set("active", true);
			}
		}else{
			active_team.model.set("steal", false);
		}
		teams[team_view_id] = active_team;
		survey.resetScore();
		survey.pickSurvey();
		setTimeout($.proxy(survey.render, survey), 3000);
	});
	
	$(".answer").on("click", function(){
		var active_team = _.find(teams, function(team) {
			return team.model.isActive();
		});
		if(active_team.model.isStealing()){
			survey.trigger("complete", survey.score);
		}
	});
	
	$(document).keypress(function(e){
		if(e.which == 120){
			var active_team = _.find(teams, function(team) {
				return team.model.isActive();
			});
			if(active_team.model.isStealing()){
				$(".strikes").show();
				$("#strike-1").show();
				document.getElementById("strike-sound").play();
				setTimeout(function(){
					$("#strike-1").hide();
					$(".strikes").hide();
				}, 1500);
				active_team.model.set("steal", false);
				active_team.model.set("active", false);
				var team_view_id = active_team.model.id - 1;
				if(team_view_id - 1 < 0){
					teams[teams.length - 1].model.set("active", true);
				}else {
					teams[team_view_id - 1].model.set("active", true);
				}
				survey.trigger("complete", survey.score);
			}else{
				active_team.model.addStrike();
			}
			teams[team_view_id] = active_team;
		} 
	});
});