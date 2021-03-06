// Mosaic Learning SCORM implementation for use when developing LMS content
// Needs to be used with the pipwerks SCORM wrapper SCORM_API_wrapper.js
// Can be downloaded from https://pipwerks.com/laboratory/scorm/
// This version has only been tested with SCORM 1.2

// Shortcut access to pipwerks SCORM functionality
var scorm = pipwerks.SCORM;

var ml_scorm = {}
  // Used to determine if communicatoin is happening with the LMS
  // Not sure if this is neccesarry, pipwerks may handle this internally
ml_scorm.lmsConnected = false;

// Global constant object for legal status types;
ml_scorm.STATUS = {
  PASSED: "passed",
  FAILED: "failed",
  COMPLETED: "completed",
  INCOMPLETE: "incomplete",
  BROWSED: "browsed",
  NOT_ATTEMPTED: "not attempted"
}
Object.freeze(ml_scorm.STATUS);

// Global constant object for legal exit conditions;
ml_scorm.EXIT = {
  TIMEOUT: "time-out",
  SUSPENED: "suspend",
  LOGOUT: "logout",
  NORMAL: ""
}
Object.freeze(ml_scorm.EXIT);

// Global constant object for legal interaction types;
ml_scorm.INTERACTION = {
  TRUE_FALSE: "true-false}",
  CHOICE: "choice",
  FILL: "fill-in",
  MATCH: "matching",
  PERFORMANCE: "performance",
  LIKERT: "likert",
  SEQUENCE: "sequencing",
  NUMERIC: "numeric"
}
Object.freeze(ml_scorm.INTERACTION);

// Global contsat object for legal interaction results
// Additional legal response is a floating point number
ml_scorm.RESULT = {
  CORRECT: "correct",
  WRONG: "wrong",
  UNANTICIPATED: "unanticipated",
  NEUTRAL: "neutral"
}
Object.freeze(ml_scorm.RESULT);

// Flag to turn debug messages on/off
// Turn off for production
// Use normal console statements for logging in production
ml_scorm.DEBUG_ENABLED = true;

ml_scorm.DEBUG = {
  LOG: function(msg) {
    if (ml_scorm.DEBUG_ENABLED) {
      console.log(msg);
    }
  },

  ERROR: function(msg) {
    if (ml_scorm.DEBUG_ENABLED) {
      console.error(msg);
    }
  },

  WARN: function(msg) {
    if (ml_scorm.DEBUG_ENABLED) {
      console.warn(msg);
    }
  },

  INFO: function(msg) {
    if (ml_scorm.DEBUG_ENABLED) {
      console.info(msg);
    }
  }
}
Object.freeze(ml_scorm.DEBUG);

// Called once a SCO has been loaded to get connection to LMS
// Handles LMSInitalize
ml_scorm.initSCO = function() {
  ml_scorm.lmsConnected = scorm.init();
}

// Called once a SCO is unloaded. Neccesary to finalize interaction
// Handles LMSFinish
ml_scorm.closeSCO = function() {
  scorm.save();
  scorm.quit();
  ml_scorm.lmsConnected = false;
}

// Called when a SCO has been completed to mark in LMS as completed
ml_scorm.completeSCO = function() {
  ml_scorm.setValue('cmi.core.lesson_status', ml_scorm.STATUS.COMPLETED);
}

// Called to update SCO status to a specific state
ml_scorm.updateStatus = function(status) {
  ml_scorm.setValue('cmi.core.lesson_status', status);
}

// Called to score a SCO. Assumes min value of zero, max of 100, and normallized
// score between the two.
ml_scorm.scoreSCO = function(score) {
  ml_scorm.setValue('cmi.core.score.raw', score);
}

// Set max SCO score. This feels wrong. Should probably give ml_scorm a Score Object
// and add accessors. Same with above. (also it just looks ugly as a function name)
ml_scorm.setMaxSCOScore = function(score) {
  ml_scorm.setValue('cmi.core.score.max', score);
}

ml_scorm.setMinSCOScore = function(score) {
  ml_scorm.setValue('cmi.core.score.min', score);
}

// Convienience wrapper for setting SCORM variables. Auto saves on call.
// NOTE if setting multiple values at once use scorm.set() directly and
// save after setting the final value to avoid slow communication with LMS
// TODO actually might ignore the previous note and have a flag to enable saving not sure if should default to true or false though. False for speed. True for convienence.
ml_scorm.setValue = function(param, value) {
  if (ml_scorm.lmsConnected) {
    ml_scorm.DEBUG.LOG(`setting ${param} to ${value}`);
    scorm.set(param, value);
    scorm.save();

  } else {
    ml_scorm.DEBUG.WARN('LMS NOT CONNECTED');
  }
}

// Convenience wrapper for getting SCROM variables.
// All values are returned as strings. Remember to parse if you
// are expecting a number
ml_scorm.getValue = function(param) {
  ml_scorm.DEBUG.INFO(`retrieving value for ${param}`);
  if (ml_scorm.lmsConnected) {
    let value = scorm.get(param);
    ml_scorm.DEBUG.LOG(`found value of ${value}`);
    return value;
  } else {
    ml_scorm.DEBUG.WARN('LMS NOT CONNECTED');
  }
}


// Retrieves bookmark location from course
ml_scorm.getBookmark = function() {
  return ml_scorm.getValue('cmi.core.lesson_location');
}

// Sets bookmark of location in course
ml_scorm.setBookmark = function(location) {
  ml_scorm.setValue('cmi.core.lesson_location', location);
}



// This is a helper object for the Objective class, but will probably be
// needed in other places as well. No functionality at the moment.
ml_scorm.Score = class Score {
  constructor(raw = 0, min = 0, max = 100) {
    this.raw = raw;
    this.min = min;
    this.max = max;
  }
}

// Objective Object for keeping track of objectives within a SCO.
// Keeps a mirror of the data it sends to the LMS locally so even RO properties
// can be accesed after storage to the LMS.
// Currently contains ID, Status and Score (as a seperate object detailed below)
// Index is frozen at creation and cannot be changed.
// Values autosave to the LMS when they are updated.

// TODO consider rewriting getters to not pull from LMS if value present
ml_scorm.Objective = class Objective {
  // Creates a new Objective object and adds it to LMS
  // Index is non editable after creation.
  constructor(index, id = "[New Objective]", group = "default") {
    Object.defineProperty(this, 'index', {
      writable: false,
      configurable: false,
      value: index
    });
    this._id = id;
    this._status = ml_scorm.STATUS.NOT_ATTEMPTED;
    this._score = new ml_scorm.Score();
    this.group = group;
    ml_scorm.DEBUG.INFO('creating new objective: ' + this._id);
    ml_scorm.setValue(`cmi.objectives.${this.index}.id`, this._id);
    ml_scorm.setValue(`cmi.objectives.${this.index}.score.min`, this._score.min);
    ml_scorm.setValue(`cmi.objectives.${this.index}.score.max`, this._score.max);
  }

  // Convenience function for completing an objective
  complete() {
    this._status = ml_scorm.STATUS.COMPLETED
    console.log('completing objective: ' + this._id);
    ml_scorm.setValue(`cmi.objectives.${this.index}.status`, this._status);
  }

  // Sets ID of objective. This is a string on the LMS.
  set id(newId) {
      this._id = newId;
      ml_scorm.setValue(`cmi.objectives.${this.index}.id`, newId);
    }
    // Pulls objective ID from LMS
  get id() {
    this._id = ml_scorm.getValue(`cmi.objectives.${this.index}.id`);
    return this._id;
  }

  // Update status with more control than complete()
  // Expects a legal value from STATUS constant
  set status(newStatus) {
    this._status = newStatus;
    ml_scorm.setValue(`cmi.objectives.${this.index}.status`, newStatus);
  }

  // Retrieve status of objective from LMS
  get status() {
    this._status = ml_scorm.getValue(`cmi.objectives.${this.index}.status`);
    return this._status;
  }

  // Sets score on LMS. Can be expanded for more complex scoring but
  // Currently takes in a raw score and records it.
  set score(rawScore) {
    this._score.raw = rawScore;
    ml_scorm.setValue(`cmi.objectives.${this.index}.score.raw`, rawScore);
  }

  // This is a read only property on the LMS so no retrival is done before
  // returning the value. this is provided to keep track of score outside
  // of the LMS
  get score() {
    return this._score.raw;
  }

  set maxScore(max) {
    this._score.max = max;
    ml_scorm.setValue(`cmi.objectives.${this.index}.score.max`, max);
  }

  get maxScore() {
    return this._score.max;
  }

  set minScore(min) {
    this._score.min = min;
    ml_scorm.setValue(`cmi.objectives.${this.index}.score.min`, min);
  }

  get minScore() {
    return this._score.min;
  }


  // Changes will be updated to the LMS as they are made to the
  // object. This method is probably redundant, but provides a way
  // to ensure that all values are saved on the object.
  save() {
    scorm.set(`cmi.objectives.${this.index}.id`, this._id);
    scorm.set(`cmi.objectives.${this.index}.score.raw`, this._score.raw);
    scorm.set(`cmi.objectives.${this.index}.score.min`, this._score.min);
    scorm.set(`cmi.objectives.${this.index}.score.max`, this._score.max);
    scorm.set(`cmi.objectives.${this.index}.status`, this._status);
    scorm.save();
  }
}

// Container class to hold all objectives for a SCO.
// Contains methods for adding new objectives one at a time or in bulk
// Should this be a class?? Can we make this just an object?
// TODO populate from LMS if values present
// NOTE changing objectives from an array to an object. Need to update docs to match
ml_scorm.TrackedObjectives = class TrackedObjectives {
  constructor() {
    this._objectives = {};
    restoreObjectives();
  }

  // Adds new objective to both the internal tracking and on the LMS
  addObjective(objectiveId, group = "default") {
    let index = ml_scorm.getValue('cmi.objectives._count');
    let id = objectiveId + '|' + group;
    let newObjective = new ml_scorm.Objective(index, objectiveId, group);
    this._objectives[objectiveId] = newObjective;
    return newObjective;
  }

  // If objectives are present repopulates this._objectives with data from LMS
  restoreObjectives() {
    let count = ml_scorm.getValue('cmi.objectives._count');
    for (let i=0; i<count: i++) {
      let id = ml_scorm.getValue(`cmi.objectives.${i}.id`);
      let scoreRaw = ml_scorm.getValue(`cmi.objectives.${i}.score.raw`);
      let scoreMax = ml_scorm.getValue(`cmi.objectives.${i}.score.max`);
      let scoreMin = ml_scorm.getValue(`cmi.objectives.${i}.score.min`);
      let status = ml_scorm.getValue(`cmi.objectives.${i}.status`);
      let group = id.split('|')[1];

      let newObjective = new ml_scorm.Objective(i, id, group);

      newObjective._score.raw = scoreRaw;
      newObjective._score.max = scoreMax;
      newObjective._score.min = scoreMin;

      newObjective._status = status;
    }
  }

  // Returns number of currently tracked objectives
  get length() {
    return Object.keys(this._objectives).length;
  }

  getObjective(id) {
    return this._objectives[id];
  }

  // Useful for when the total score is a combined total of all sub objectives.
  // sums all existing scores for tracked objectives.
  calculateTotalScore(group = "default") {

   let objectives = Object.values(this._objectives);

    return objectives.reduce( (total, obj) => {
      if (obj.group === group) {
        return total + obj.score;
      } else {
        return total;
      }
    }, 0);
  }

  checkAllCompleted() {
    let objectives = Object.values(this._objectives);

    return objectives.reduce( (completed, obj) => {
      return completed && (obj._status === ml_scorm.STATUS.completed)
    }, true);

  }

  // Convienence function to add a list of objectives all at once
  // Takes in a list of IDs and creates a new objective for each
  // Will only add list if LMS does not contain any objectives at
  // the time it is run. Can be expanded at some point to include
  // more involved checking and adding of missing or updated objectives.
  initializeList(listOfIds) {
    let currentObjectivesCount = parseInt(ml_scorm.getValue('cmi.object._count'));
    if (currentObjectivesCount) {
      ml_scorm.DEBUG.log('objectives already initialized');
      return;
    } else {
      listOfIds.forEach(obj => this.addObjective(obj));
    }
  }
}

// Interaction object for tracking student interactions
// Takes in a config object to initialize the many available properties
ml_scorm.Interaction = class Interaction {
  constructor(index, config) {
    Object.defineProperty(this, 'index', {
      writable: false,
      configurable: false,
      value: index
    });

    this._id = config.id;
    // must be unique
    // required

    this._type = config.type;
    // use INTERACTION types
    // required

    this._objectives = config.objectives;
    // objectives.n.id
    // this is purely informative, there is no actual linking to
    // Objectives
    // optional

    this._startTime = ""

    this._finishTime = "";
    // this is inconsistently documented as both the time interaction
    // was first shown to student, and time interaction was completed
    // im going to use completed for tracking, but if you want to change
    // that feel free
    // time interaction was completed (format HH:MM:SS.SS) WO
    // optional

    this._correct_responses = config.correct_responses;
    // correct_responses.n.pattern
    // purely informational - developer can use at discression
    // useful for logs and analysis
    // can have multiple correct responses
    // each pattern can be weighted differently
    // dependent on type, types expect the following formats
    // true-false: 0,1,t,f
    // choice: 1 or mare characters[0-9,a-z,A-Z] seperated by a comma
    //  student response will be single character
    //  if multiple answers must be selected use CSV in {}
    // fill-in: alphanumeric string, spaces significant
    // numeric: single number with or without decimal
    // likert: can be blank, no incorrect response
    //  strongly agree - agree - neutral - disagree - strongly disagree
    // matching: pairs of identifiers separated by a period
    // performance: alphanumeric string 255 chars max
    // sequencing: series of single characters [0-9,a-z,A-Z]
    // optional

    this._weighting = config.weighting;
    // single floating point number, higher numbers weighted heavier
    // optional

    this._student_response = '';
    // see correct_responses for further details
    // optional

    this._result = ml_scorm.RESULT.NEUTRAL;
    // use legal values from RESULT constant or a floating point number
    // optional

    this._latency = "";
    // HHHH:MM:SS.SS
    // time from presentation of stimulus to completion of mesurable response
    // ie how long it takes the student to answer the question
    // optional

    // takes values and writes initial state to LMS
    this.save()
    ml_scorm.DEBUG.INFO('creating new interaction: ' + this._id);

  }

  // Sets ID of interaction. This is a string on the LMS.
  set id(newId) {
    this._id = newId;
    ml_scorm.setValue(`cmi.interactions.${this.index}.id`, newId);
  }

  // Pulls interaction ID from LMS
  // This is write only value on LMS, returned value is from object
  get id() {
    return this._id;
  }

  // Sets type of interaction.
  // This needs to be a legal value from the INTERACTION const
  set type(newType) {
    this._type = newType;
    ml_scorm.setValue(`cmi.interactions.${this.index}.type`, newType);
  }

  // Returns interaction type.
  // This is a write only value on LMS, returned value is from object
  get type() {
    return this._type;
  }

  // Sets new objective array for interactions.
  // objectives is currently set up to use the Objective objects
  // but since there is no actual realtion and you can only track
  // a string it may make sense to do this through just a string
  set objectives(newObjectives) {
    this._objectives = newObjectives;
    for (i = 0; i < this.newObjectives.length; i++) {
      scorm.set(`cmi.interactions.${this.index}.objectives.${this._objectives.length - 1}.id`, this._objectives[i].id);
    }
    scorm.save();
  }

  // Gets interactions objectives array and logs the current count.
  // Can get rid of log if desired.
  get objectives() {
    let count = ml_scorm.getValue(`cmi.interactions.${this.index}.objectives._count`);
    ml_scorm.DEBUG.LOG(`there are currently ${count} interaction objectives`);
    return this._objectives;
  }

  addObjective(objective) {
    this._objectives.push(objective);
    ml_scorm.setValue(`cmi.interactions.${this.index}.objectives.${this._objectives.length - 1}.id`, objective.id);
  }

  set startTime(t) {
    this._startTime = t;
  }

  get startTime() {
    return this.formatTime(this._startTime);
  }

  // Sets finishTime and updates latency based on start time.
  set finishTime(t) {
    this._finishTime = t;
    this._latency = formatTime(this.startTime - t);
    scorm.set(`cmi.interactions.${this.index}.time`, t);
    scorm.set(`cmi.interactions.${this.index}.latency`, this._latency);
    scorm.save();
  }

  // Returns finish time
  get finishTime() {
    return this.formatTime(this._finishTime);
  }

  set latency(t) {
    this._latency = t;
  }

  get latency() {
    return this.formatTimespan(this._latency);
  }

  // Adds correct response patterns to interaction in sequential order.
  // Patterns are dependent on the type of interaction.
  set correct_responses(newResponses) {
    this.correct_responses = newResponses;
    for (i = 0; i < this.correct_responses.length; i++) {
      scorm.set(`cmi.interactions.${this.index}.correct_responses.${i}.pattern`, this._correct_responses[i]);
    }
    scorm.save();
  }

  // Gets the correct_response array and logs the count
  // Can get rid of log if desired
  get correct_responses() {
      ml_scorm.DEBUG.LOG(`there are currently ${ml_scorm.getValue(`cmi.interactions.${this.index}.correct_responses._count`)} correct response patterns`);
    return this._correct_responses;
  }

  // Sets the score weighting of the interaction
  set weighting(newWeight) {
    this._weighting = newWeight;
    ml_scorm.setValue(`cmi.interactions.${this.index}.correct_responses`, newWeight);
  }

  // Gets the score weigthing of the interaction
  // This is a write only value on LMS, returned value is from object
  get weighting() {
    return this._weighting;
  }

  // Sets student_response
  // Response format is dependent on the type of interaction
  set student_response(newResponse) {
    this._student_response = newResponse;
    ml_scorm.setValue(`cmi.interactions.${this.index}.student_response`, newResponse);
  }

  // Gets student_response
  // This is a write only value on LMS, returned value is from object
  get student_response() {
    return this._student_response;
  }

  // Sets interaction result
  // This needs to be a legal value from the RESULT constant
  set result(newResult) {
    this._result = newResult;
    ml_scorm.setValue(`cmi.interactions.${this.index}.result`, newResult);
  }

  // Gets result
  // This is a write only value on LMS, returned value is from object
  get result() {
    return this._result;
  }


  // Initializes interaction object and logs state to LMS.
  // Some values ie startTime, finishTime need to be updated at later points
  // through the begin() and complete() methods.
  // This method is called automatically at creation.
  initialize() {
    this.save();
  }

  // Helper function to format the current time to an acceptable format for LMS
  // the LMS expects HH:MM:SS.SS for cmi.interactions.n.time
  // and HHHH:MM:SS.SS for cmi.interactions.n.latency
  // the decimal seconds are optional but can only take two digits.
  // The first two digits on latency (HH) are optional but are currently
  // formatted with padded zeros.
  formatTime(date) {
    return date.toTimeString().slice(0,8);
  }

  // This formats time for cmi.interactions.n.latency which expects HHHH:MM:SS.SS
  // Takes in time as milliseconds and outputs a formatted string.
  // Easiest way to use is formatTime(d1-d2) where d1 and d2 are both Date objects
  // This will only work reliably for time periods under 24 hours in length;
  // If we need to track times greater than 24 hours between interactions
  // this will need to be rewritten to manipulate t directly
  formatTimespan(date) {
    let hours = String('0000' + date.getUTCHours()).slice(-4);
    let minutes = String('00' + date.getUTCMinutes()).slice(-2);
    let seconds = String('00' + date.getUTCSeconds()).slice(-2);
    let milliseconds = String(date.getUTCMilliseconds() + '00').substring(0,2);
    let formattedTime =  `${hours}:${minutes}:${seconds}.${milliseconds}`;
    return formattedTime;
  }

  // After object has been initialized call this to begin an interaction.
  // Currently sets startTime for latency calculations but can be
  // updated with any other actions that need to happen at start time
  // Consider giving this an argument to accept a function to be executed
  // so that individual interactions can call their own functions.
  start() {
    this._startTime = new Date();
  }

  // After interaction has been started with begin() use this to complete
  // an interaction. It sets the finishTime and Latency, but can be updated
  // with any other actions that need to happen at completion time.
  // Consider giving this an argument to accept a function to be executed
  // so that individual interactions can call their own functions.
  finish() {
    this._finishTime = new Date();
    this._latency = new Date(this._finishTime - this._startTime);

    scorm.set(`cmi.interactions.${this.index}.time`, this.finishTime);
    scorm.set(`cmi.interactions.${this.index}.latency`, this.latency);
    scorm.save();
  }

  // Changes will be updated to the LMS as they are made to the
  // object. This method is probably redundant, but provides a way
  // to ensure that all values are saved on the object.
  // The objectives and correct_response loop gets reused a lot
  // consider refactoring into a function. Should be able to get both in one
  // updateList or something
  save() {
    scorm.set(`cmi.interactions.${this.index}.id`, this._id);
    if (this.type)
      scorm.set(`cmi.interactions.${this.index}.type`, this._type);
    for (let i=0; i<this._objectives.length; i++) {
      scorm.set(`cmi.interactions.${this.index}.objectives.$[i}.id`, this._objectives[i].id);
    }
    if (this._finishTime)
      scorm.set(`cmi.interactions.${this.index}.time`, this._finishTime);
    for (let i=0; i<this.correct_responses.length; i++) {
      scorm.set(`cmi.interactions.${this.index}.correct_responses.${i}.pattern`, this._correct_responses[i]);
    }
    scorm.set(`cmi.interactions.${this.index}.weighting`, this._weighting);
    if (this._student_response)
      scorm.set(`cmi.interactions.${this.index}.student_response`, this._student_response);
    if (this._result)
      scorm.set(`cmi.interactions.${this.index}.result`, this._result);
    if (this._latency)
      scorm.set(`cmi.interactions.${this.index}.latency`, this.latency);

    scorm.save();
  }
}

// Class for tracking a collection of Interactions
// Doesn't do a whole lot right now other than ensure added interactions go
// in sequntial order.
// Consider turning into factory method and having interactions array be external
ml_scorm.TrackedInteractions = class TrackedInteractions {
  constructor() {
    this._interactions = {};
    this.blankConfig = new ml_scorm.InteractionConfig();
  }

  // Creates and adds new interaction to the tracked array.
  // Places in next availlable slot on the LMS
  // To update existing ones interact with the objects
  // TODO Need way to manage interactions that have been completed in a previous session
  //      for scoring purposes;
  addInteraction(config = this.blankConfig) {
    let index = ml_scorm.getValue('cmi.interactions._count');
    let newInteraction = new ml_scorm.Interaction(index, config);
    this._interactions[config.id] = newInteraction;
    return newInteraction;
  }

  // Returns number of currently tracked interactions
  get length() {
    return Object.keys(this._interactions).length;
  }

  getInteraction(id) {
    return this._interactions[id];
  }
}

ml_scorm.InteractionConfig = class InteractionConfig {
  constructor() {
    this.id = "";
    this.type = "";
    this.objectives = [];
    this.time = "";
    this.correct_responses = [];
    this.weighting = 1;
    this.student_response = "";
    this.result = "";
    this.latency = "";
  }
}
