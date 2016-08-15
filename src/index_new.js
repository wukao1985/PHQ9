/**
 Copyright 2016 Kao Wu
 */
 
 'use strict';
 
var questions = [
    "Little interest or pleasure in doing things",
    "Feeling down, depressed or hopeless",
    "Trouble falling sleep, staying asleep, or sleeping too much",
    "Feeling tired or having little energy",
    "Poor appetite or overeatign",
    "Feeling Bad about yourself - or that you're a failure or have let \
	 yourself or your family down.",
    "Trouble concerntraing on things, such as reading the newspaper or \
	 watching television",
    "Moving or speaking so slowly that other people could have noticed.\
     Or the opposite - being so fidgety or restless that you have been \
	 moving around a lot more than usual.",
    "Thoughts that you would be better off dead or hurting yourself in \
	 some way."
]

var diagnoses = [
    "Congratulations! It seems like you don't have any depression sympotom. Keep it up. ",
    "You have minimal depression symptoms. I recommand that you find some support and return to the \
        assessment in one month. ",
    "You have mild level depression. It's recommanded that you seek support and continuesely monitor \
        your situation. ",
    "You have major depression, and antidepressant or psychotherapy is recommanded. ",
    "You have severe depression, please seek ntidepressant or psychotherapy immediately for your health. "
]

var default_answers = " " + " One, Not at all.  Two, several days. Three, more than   \
                       half the days. Four, nearly every day."
					   

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */

        //if (event.session.application.applicationId !== "amzn1.ask.skill.ebf6d09b-5cfa-4072-bc67-851339188ba0") {
         //  context.fail("Invalid Application ID");
        //}

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
        + ", sessionId=" + session.sessionId);

    // add any session init logic here
}

/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId
        + ", sessionId=" + session.sessionId);

    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId
        + ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // handle yes/no intent after the user has been prompted
    if (session.attributes && session.attributes.userPromptedToContinue) {
        delete session.attributes.userPromptedToContinue;
        if ("AMAZON.NoIntent" === intentName) {
            handleFinishSessionRequest(intent, session, callback);
        } else if ("AMAZON.YesIntent" === intentName) {
            handleRepeatRequest(intent, session, callback);
        }
    }

    // dispatch custom intents to handlers here
    if ("AnswerIntent" === intentName) {
        handleAnswerRequest(intent, session, callback);
    } else if ("AnswerOnlyIntent" === intentName) {
        handleAnswerRequest(intent, session, callback);
    } else if ("AMAZON.YesIntent" === intentName) {
        handleAnswerRequest(intent, session, callback);
    } else if ("AMAZON.NoIntent" === intentName) {
        handleAnswerRequest(intent, session, callback);
    } else if ("AMAZON.StartOverIntent" === intentName) {
        getWelcomeResponse(callback);
    } else if ("AMAZON.RepeatIntent" === intentName) {
        handleRepeatRequest(intent, session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        handleGetHelpRequest(intent, session, callback);
    } else if ("AMAZON.StopIntent" === intentName) {
        handleFinishSessionRequest(intent, session, callback);
    } else if ("AMAZON.CancelIntent" === intentName) {
        handleFinishSessionRequest(intent, session, callback);
    } else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
                + ", sessionId=" + session.sessionId);
    
    // Add any cleanup logic here
}

// ---------- Skill specific Logic ------------------
var ANSWER_COUNT = 4;
var CARD_TITLE = "Trivia"; // Be sure to change this for your skill.

function getWelcomeResponse(callback) {
    var sessionAttributes = {},
        speechOutput = "Hi, this is patient health questinnaire from Better me. "
        speechOutput += "During the assessment, I will lsit " + questions.length.toString()
            + " problems, try to recall how many times you encoutered these problems during \
            the last two weeks. There are four choises: not at all, several days, more than half \
            the days , nearly every day.	Try to choose the most close answer based on your \
			situation. Let's begin. ";
     var shouldEndSession = false,
		
		currentQuestionIndex = 0,
		spokenQuestion = questions[currentQuestionIndex],
		repromptText = "Question 1. " + spokenQuestion + ". " + default_answers + " ";
		
		speechOutput += repromptText;
		sessionAttributes = {
			"speechOutput": repromptText,
			"repromptText": repromptText,
			"currentQuestionIndex": currentQuestionIndex,
			"questions": questions,
			"score": 0,
		};
		callback(sessionAttributes,
			buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, shouldEndSession));
}

function handleAnswerRequest(intent, session, callback) {
    var speechOutput = "";
	var repromptText = "";
    var sessionAttributes = {};
    var sessionInProgress = session.attributes && session.attributes.questions;
	var answerSlotValid = isAnswerSlotValid(intent);

    if (!sessionInProgress) {
        // If the user responded with an answer but there is no game in progress, ask the user
        // if they want to start a new game. Set a flag to track that we've prompted the user.
        sessionAttributes.userPromptedToContinue = true;
        speechOutput = "There is no session in progress. Do you want to start a new session? ";
        callback(sessionAttributes,
            buildSpeechletResponse(CARD_TITLE, speechOutput, speechOutput, false));
	} else {
        var sessionQuestions = session.attributes.questions,
            currentScore = parseInt(session.attributes.score),
            currentQuestionIndex = parseInt(session.attributes.currentQuestionIndex);
        if (answerSlotValid) {
			currentScore += parseInt(intent.slots.Answer.value) - 1;
		}
		if (currentQuestionIndex == session.attributes.questions.length - 1) {
			// add specific diagnose afterwoods
			speechOutput = "Your final score is " + currentScore.toString() + " ";
            if (currentScore < 5) {
                speechOutput += diagnoses[0];
            } else if (currentScore < 10) {
                speechOutput += diagnoses[1];
            } else if (currentScore < 15) {
                speechOutput += diagnoses[2];
            } else if (currentScore < 20) {
                speechOutput += diagnoses[3];
            } else {
                speechOutput += diagnoses[4];
            }
            
            speechOutput += "Thank you for taking Patient Health Questionnaire. Take care!";
            callback(session.attributes,
                buildSpeechletResponse(CARD_TITLE, speechOutput, "", true));
		} else {
			currentQuestionIndex += 1;
			var spokenQuestion = session.attributes.questions[currentQuestionIndex],
			    questionIndexForSpeech = currentQuestionIndex + 1;

			speechOutput += "Question " + questionIndexForSpeech.toString() + ". "
                			+ spokenQuestion + ". " + default_answers + " ";
			repromptText = "Question " + questionIndexForSpeech.toString() + ". "
                			+ spokenQuestion + ". " + default_answers + " ";
			sessionAttributes = {
                "speechOutput": repromptText,
                "repromptText": repromptText,
                "currentQuestionIndex": currentQuestionIndex,
                "questions": sessionQuestions,
                "score": currentScore,
            };
            callback(sessionAttributes,
                buildSpeechletResponse(CARD_TITLE, speechOutput, repromptText, false));
		}
	}
}

function handleRepeatRequest(intent, session, callback) {
    // Repeat the previous speechOutput and repromptText from the session attributes if available
    // else start a new game session
    if (!session.attributes || !session.attributes.speechOutput) {
        getWelcomeResponse(callback);
    } else {
        callback(session.attributes,
            buildSpeechletResponseWithoutCard(session.attributes.speechOutput, session.attributes.repromptText, false));
    }
}

function handleGetHelpRequest(intent, session, callback) {
    // Provide a help prompt for the user, explaining how the game is played. Then, continue the game
    // if there is one in progress, or provide the option to start another one.

    // Set a flag to track that we're in the Help state.
    session.attributes.userPromptedToContinue = true;

    // Do not edit the help dialogue. This has been created by the Alexa team to demonstrate best practices.

    var speechOutput = "I will lsit " + questions.length.toString()
            + " problems, try to recall how many times you encoutered these problems during \
            the last two weeks. There are four choises: not at all, several days, more than half \
            the days and nearly every day.	Try to choose the most close answer based on your \
			situation.",
        repromptText = "Would you like to start the assessment?",
        shouldEndSession = false;
    callback(session.attributes,
        buildSpeechletResponseWithoutCard(speechOutput, repromptText, shouldEndSession));
}

function handleFinishSessionRequest(intent, session, callback) {
    // End the session with a "Good bye!" if the user wants to quit the game
    callback(session.attributes,
        buildSpeechletResponseWithoutCard("Thank you for taking the assessment. Good bye!" + " ", "", true));
}

function isAnswerSlotValid(intent) {
    var answerSlotFilled = intent.slots && intent.slots.Answer && intent.slots.Answer.value;
    var answerSlotIsInt = answerSlotFilled && !isNaN(parseInt(intent.slots.Answer.value));
    return answerSlotIsInt && parseInt(intent.slots.Answer.value) < (ANSWER_COUNT + 1) && parseInt(intent.slots.Answer.value) > 0;
}

// ------- Helper functions to build responses -------
function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}
		
 function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}