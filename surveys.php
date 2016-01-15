<?php
	//Connect to the database and grab all surveys
	$db = new PDO("mysql:dbname=family_feud;host=127.0.0.1", 'family_feud', 'getSurveys');
	$surveys = [];
	foreach($db->query("SELECT * FROM surveys") as $survey){
		$surveys[$row['id']] = $survey;
		foreach($db->query("SELECT * FROM answers WHERE survey_id = " . $row['id'] . " ORDER BY rank") as $answer){
			$surveys[$row['id']]['answers'][$answer['rank']] = $answer;
		}
	}
	
?>

<!DOCTYPE html>
<html>
<head>
<script type="text/javascript" src="assets/jquery-2.2.0.min.js"></script>
<meta charset="UTF-8">
<title>Family Feud Surveys</title>
</head>
<body>
<h1>Survey Answers</h1>
<?php foreach($surveys as $survey){?>
<h3><?php print $survey['id'] . " - " . $survey['question'];?></h3>
<ul>
<?php foreach($survey['answers'] as $answer) {?>
<li><?php print $answer['rank'] . " - " . $answer['value'] . " " . $answer['points']?></li>
<?php }?>
</ul>
<?php }?>
</body>
</html>
