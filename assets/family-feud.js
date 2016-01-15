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
		this.get("active");
	},
	addStrike: function () {
		this.set("strikes", this.get("strikes") + 1);
		if(this.get("strikes") == 3){
			this.trigger("strikeout");
			this.set("strikes", 0);
		}
	},
	isStealing: function() {
		this.get("steal");
	}
});

var TeamView = Backbone.View.extend({
	initialize: function() {
		this.model.on("change:score", this.render);
	},
	tagName: "div",
	boardSide: "left",
	template: _.template('<div id="team-<%= id %>"><div class="team-score"><%= score %></div><div class="team-name" style="background-color:<%= color %>"><%= name %></div></div>'),
	render: function() {
		if(this.$el){
			this.$el.html(this.template(this.model.attributes));
		}else{
			$(".team-scores."+this.boardSide).append(this.template(this.model.attributes));
		}
	}
});

var SurveyView = Backbone.View.extend({
	className: "survey-wrapper",
	score: 0,
	surveys: null,
	activeSurveyId: null,
	flippedAnswers: 0,
	initialize: function(){
		$.getJSON("surveys.json", function(data){
			this.surveys = data;
		});
	},
	pickSurvey: function(survey_id) {
		if(!survey_id){
			if(!this.activeSurveyId){
				this.activeSurveyId = 1;
			}else{
				this.activeSurveyId++;
			}
		}else{
			this.activeSurveyId = survey_id;
		}
	},
	questionTemplate: _.template('<h3 class="survey-question"><%= question =></h3>'),
	answerTemplate: _.template('<%= answer %> - <%= points %>'),
	render: function(){
		var activeSurvey = this.surveys[this.activeSurveyId];
		this.$(".answer").flip(false);
		this.$(".answer").once("click", this.flipAnswer, this);
		this.$(".survey").html(this.questionTemplate(activeSurvey.question));
		_.each(activeSurvey.answers, this.renderAnswer());
		this.$(".score").html("0");
	},
	renderAnswer: function(answer, rank) {
		this.$("#answer-"+rank+" .back").html(this.answerTemplate(answer));
	},
	flipAnswer: function(e) {
		e.target.flip(true);
		var activeSurvey = this.surveys[this.activeSurveyId];
		this.updateScore(activeSurvey.answers[e.target.id.substr(-1)].points);
		this.flippedAnswers++;
		if(this.flippedAnswers == activeSurvey.answers.length){
			this.trigger("complete", this.score);
		}
	},
	updateScore: function(points) {
		this.score = this.score + points;
		this.$(".score").html(this.score);
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
	for(i = 0; i <= game_data.tn.length; i++){
		var tm = new TeamModel({
			id: i + 1,
			name: game_data.tn[i],
			color: game_data.tc[i]
		});
		if(i <= team_half){
			var board_side = "left";
		}else {
			var board_side = "right";
		}
		var teamid = i+1;
		teamid = teamid.toString();
		teams[i] = new TeamView({
			id: "team-"+teamid,
			model: tm,
			boardSide: board_side
		});
		teams[i].render();
	}
	_.each(teams, function(team, team_id) {
		team.model.on("strikeout", function(){
			team.model.set("active", false);
			teams[team_id+1].model.set("active", true);
			teams[team_id+1].model.set("steal", true);
		});
	});
	teams[0].model.set("active", true);
	
	$(".survey-wrapper .answer").flip({trigger: "manual", axis: "x"});
	
	var survey = new SurveyView();
	
	survey.pickSurvey();
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
		survey.pickSurvey();
		survey.render();
	});
	
	survey.$(".answer").on("click", function(){
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
				active_team.model.set("steal", false);
				active_team.model.set("active", false);
				var team_view_id = active_team.model.id - 1;
				if(team_view_id - 1 < 0){
					teams[teams.length - 1].model.set("active", true);
				}else {
					teams[team_view_id - 1].model.set("active", true);
				}
			}else{
				active_team.model.addStrike();
			}
			teams[team_view_id] = active_team;
			survey.trigger("complete", survey.score);
		} 
	});
});