// render.js (Renderer Process)
document.addEventListener('DOMContentLoaded', () => {
    console.log("Page Loaded");

    ////////////////////////////////
    // global vars
    ////////////////////////////////
    let userId = 0;
    const state = new State();
    state.setLoggedInStatus(false);






    ////////////////////////////////
    // event handlers
    ////////////////////////////////



    ////////////////////
    // index page
    ////////////////////
    const loginForm = document.querySelector('.login-form');
    const cancelBtnLi = document.querySelector('.cancel-btn-login');
    const submitBtnLi = document.querySelector('.submit-btn-login');  // optional, not strictly used
    const modalOverlayLi = document.querySelector('.modal-overlay-login');
    console.log("loginForm:", loginForm);
    console.log("cancelBtnLi:", cancelBtnLi);
    console.log("submitBtnLi:", submitBtnLi);

    // Handle form submission
    loginForm.addEventListener('submit', function (e) {
      showToast("form submitted", "success");
      
        e.preventDefault(); // Prevent default form submission

        const username = loginForm.username.value.trim();
        const password = loginForm.password.value;

        if (username === '' || password === '') {
            showToast("Please enter both username and password", "error");
            return;
        }

        console.log('Form submitted with:');
        console.log('Username:', username);
        console.log('Password:', password);

        // send message to index.js
        window.electronAPI.userLogin({ userName: username, password: password });

        loginForm.reset();
        modalOverlayLi.style.display = 'none'; // hide modal
    });

    // Handle cancel button
    cancelBtnLi.addEventListener('click', function (e) {
        e.preventDefault(); // Prevent form submission
        loginForm.reset(); // Clear the form
        // modalOverlayLi.style.display = 'none'; // Hide modal
        console.log('Login cancelled.');
    });




    ////////////////////
    // selection page
    ////////////////////
    const modalOverlaySelection = document.querySelector('.modal-overlay-selection');
    const newEventBtn = document.getElementById("newEventBtn");
    console.log('newEventBtn: ', newEventBtn);

    const eventBtn = document.getElementById("eventBtn");
    console.log('newEventBtn: ', eventBtn);


    // Handler for New Event
    newEventBtn.addEventListener("click", function () {
      console.log("New Event button clicked");
      modalOverlaySelection.style.display = "none";
      newEventsModalOverlay.style.display = "flex";
    });

    // Handler for Event
    eventBtn.addEventListener("click", function () {
      console.log("Event button clicked");
      modalOverlaySelection.style.display = "none";
      eventsModalOverlay.style.display = "flex";
    });

    ////////////////////
    // EVENTS PAGE
    ////////////////////
    const eventsModalOverlay = document.querySelector(".modal-overlay-events");
    const eventBackBtn = document.querySelector(".back-btn-event");
    const eventCancelBtn = document.querySelector(".cancel-btn-event");
    const eventSubmitBtn = document.querySelector(".submit-btn-event");
    const navLeft = document.querySelector(".nav-left");
    const navRight = document.querySelector(".nav-right");
    const form = document.querySelector(".modal-form-event");

    // Example: list of mock events for navigation
    const eventData = [
      {
        date: "2025-07-01",
        exercise: "bench",
        set: 3,
        weight: 100,
        reps: 8,
        actual_reps: 8,
      },
      {
        date: "2025-07-03",
        exercise: "squat",
        set: 5,
        weight: 120,
        reps: 5,
        actual_reps: 5,
      }
    ];

    let currentEventIndex = 0;

    // Fill the form with data
    function populateForm(data) {
      form.date.value = data.date;
      form.exercise.value = data.exercise;
      form.set.value = data.set;
      form.weight.value = data.weight;
      form.reps.value = data.reps;
      form.actual_reps.value = data.actual_reps || "";
    }

    // Handle Add Event (show modal)
    eventSubmitBtn.addEventListener("click", () => {
      console.log('event submit button pressed');
      // eventsModalOverlay.style.display = "flex";
      // form.reset();
      // currentEventIndex = eventData.length; // Treat as new entry
    });

    // Handle Back Button
    eventBackBtn.addEventListener("click", () => {
      eventsModalOverlay.style.display = "none";
      modalOverlaySelection.style.display = "flex";
      console.log('event back button pressed');
    });

    // Handle Cancel Button
    eventCancelBtn.addEventListener("click", () => {
      if (confirm("Discard changes?")) {
        // eventsModalOverlay.style.display = "none";
        console.log('event cancel button pressed');
      }
    });

    // Handle Submit
    form.addEventListener("submit", (e) => {
    
      e.preventDefault();

      const formData = {
        date: form.date.value,
        exercise: form.exercise.value,
        set: parseInt(form.set.value, 10),
        weight: parseFloat(form.weight.value),
        reps: parseInt(form.reps.value, 10),
        actual_reps: form.actual_reps.value ? parseInt(form.actual_reps.value, 10) : null,
      };

      if (currentEventIndex >= eventData.length) {
        eventData.push(formData); // Add new
        showToast("Event added", "success");
      } else {
        eventData[currentEventIndex] = formData; // Update existing
        showToast("Event updated", "success");
      }

      eventsModalOverlay.style.display = "none";
    });

    // Handle Left Nav
    navLeft.addEventListener("click", () => {
      if (currentEventIndex > 0) {
        currentEventIndex--;
        populateForm(eventData[currentEventIndex]);
      } else {
        showToast("This is the first event", "success");
      }
    });

    // Handle Right Nav
    navRight.addEventListener("click", () => {
      if (currentEventIndex < eventData.length - 1) {
        currentEventIndex++;
        populateForm(eventData[currentEventIndex]);
      } else {
        showToast("This is the last event", "success");
      }
    });

    // Optional: preload first event if any
    if (eventData.length > 0) {
      populateForm(eventData[0]);
    }


    ////////////////////
    // NEW EVENTS PAGE
    ////////////////////
    const newEventsModalOverlay = document.querySelector(".modal-overlay-ne");
    const newEventBackBtn = document.querySelector(".back-btn-ne");
    const newEventCancelBtn = document.querySelector(".cancel-btn-ne");
    const newEventSubmitBtn = document.querySelector(".submit-btn-ne");
    const newEventForm = document.querySelector(".modal-form-ne");

 

    // Handle Back Button
    newEventBackBtn.addEventListener("click", () => {
      console.log('new back button pressed');
      newEventsModalOverlay.style.display = "none";
      modalOverlaySelection.style.display = "flex";
    });

    // Handle Cancel Button
    newEventCancelBtn.addEventListener("click", () => {
      console.log('new event cancel button pressed');
    });

    // Handle Submit
    newEventForm.addEventListener("submit", (e) => {
      console.log('new event submit button pressed');
      e.preventDefault();

      const formData = {
        userId: userId,
        date: form.date.value,
        exerType: form.exercise.value,
        set: parseInt(form.set.value, 10),
        weight: parseFloat(form.weight.value),
        plannedReps: parseInt(form.reps.value, 10),
        actualReps: 0,
      };

      console.log('formData:\n' + JSON.stringify(formData, null, 2));

      if (currentEventIndex >= eventData.length) {
        eventData.push(formData); // Add new
        showToast("Event added", "success");
      } else {
        eventData[currentEventIndex] = formData; // Update existing
        showToast("Event updated", "success");
      }

      window.electronAPI.saveEvent(formData);

      // NewEventsModalOverlay.style.display = "none";
    });




    ////////////////////////////////
    // show login modal on load
    ////////////////////////////////
    if (!state.getLoggedInStatus()) {
        modalOverlayLi.style.display = 'flex'; // show modal if not logged in
    }


   

    ////////////////////////////////
    // IPC handlers
    ////////////////////////////////

    // Receive login response
    window.electronAPI.onLoginResponse((response) => {
        console.log("Login response:", response);

        if (response.success == true) {
            showToast("Login successful", "success");
            console.log("login successful");
            modalOverlayLi.style.display = 'none'; // Hide index modal
            modalOverlaySelection.style.display = 'flex'; // unhide selection modal

        } else {
            showToast("Login failed: " + response.message, "error");
            console.log("login not successful");
        }
        loginForm.reset();
    });


    window.electronAPI.onSaveEventResponse((response) => {
      console.log("Save event response:", response);

      if (response.success == true) {
            showToast("Save event successful", "success");
            console.log("Save event successful");

        } else {
            showToast("Save event failed: " + response.message, "error");
            console.log("Save event not successful");
        }
    });





    ////////////////////////////////
    // misc functions
    ////////////////////////////////

    // toast implementation
    function showToast(message, type = "success") {
        const container = document.getElementById("toast-container");
        const toast = document.createElement("div");
        toast.classList.add("toast", type);
        toast.textContent = message;

        container.appendChild(toast);

        // Remove after animation
        setTimeout(() => {
            toast.remove();
        }, 3500);
    }




}); // end of 'DOMContentLoaded()


class State {
    constructor() {
      this.isLoggedIn = false;
      this.username = "";
      this.userId = 0;
      this.userRole = "";
    }

    // Getter for isLoggedIn
    getLoggedInStatus() {
      console.log(`getLoggedInStatus(): ${this.isLoggedIn}`);
      return this.isLoggedIn;
    }
  
    // Setter for isLoggedIn
    setLoggedInStatus(status) {
      console.log(`setLoggedInStatus(): ${status}}`);
      this.isLoggedIn = status;
    }

    // Getter for username
    getUsername() {
      console.log(`getUsername(): ${this.username}`);
      return this.username;
    }
  
    // Setter for username
    setUsername(name) {
      console.log(`setUsername(): ${name}}`);
      this.username = name;
    }

    // Getter for cmdID
    getUserId() {
        console.log(`getUserId(): ${this.userId}`);
        return this.userId;
    }
    
    // Setter for cmdID
    setUserId(value) {
    console.log(`setUserId(): ${value}}`);
    this.userId = value;
    }

    // getter for isAdmin
    getUserRole() {
        console.log(`getUserRole(): ${this.userRole}`);
        return this.userRole;
    }

    // setter for isAdmin
    setUserRole(status) {
        this.userRole = status;
        console.log(`setUserRole(): ${this.userRole}`);
    }

  }