function loadData() {
  // Load announcements
  const announcementsList = document.getElementById("announcements-list");
  announcementsList.innerHTML = "";

  // Load assignments
  const assignmentsList = document.getElementById("assignments-list");
  assignmentsList.innerHTML = "";

  // Load courses
  const coursesList = document.getElementById("courses-list");
  coursesList.innerHTML = "";

  chrome.storage.local.get(["classes", "plannable"], function (result) {
    const { classes, plannable } = result;

    // Handle courses
    if (classes) {
      classes.forEach((course) => {
        const listItem = document.createElement("li");
        listItem.textContent = course.name;
        coursesList.appendChild(listItem);
      });
    } else {
      coursesList.innerHTML = "<li>No courses found</li>";
    }

    // Handle plannable items
    if (plannable) {
      // Process assignments and quizzes with priority handling
      const now = new Date();
      const twoWeeksFromNow = new Date(
        now.getTime() + 14 * 24 * 60 * 60 * 1000
      );

      const assignmentAndQuizItems = plannable
        .filter(
          (item) =>
            (item.plannable_type === "assignment" ||
              item.plannable_type === "quiz") &&
            item.plannable.due_at // Only include items with due dates
        )
        .map((item) => {
          const dueDate = new Date(item.plannable.due_at);
          const daysUntilDue = Math.ceil(
            (dueDate - now) / (1000 * 60 * 60 * 24)
          );

          return {
            ...item,
            daysUntilDue,
            isPriority: daysUntilDue <= 2, // Priority if due within a week
            isUpcoming: daysUntilDue <= 14, // Upcoming if due within two weeks
          };
        })
        .sort((a, b) => a.daysUntilDue - b.daysUntilDue) // Sort by days until due
        .filter((item) => item.isUpcoming); // Only show items due within two weeks

      if (assignmentAndQuizItems.length > 0) {
        assignmentAndQuizItems.forEach((item) => {
          const listItem = document.createElement("li");
          listItem.style.display = "flex";
          listItem.style.justifyContent = "space-between";
          listItem.style.alignItems = "center";
          listItem.style.padding = "10px 0";

          // Create title and course div
          const titleDiv = document.createElement("div");
          titleDiv.style.flex = "1";

          // Add title
          const title = document.createElement("div");
          title.textContent =
            item.plannable.title || item.plannable.name || "No Title";
          title.style.fontWeight = item.isPriority ? "bold" : "normal";
          titleDiv.appendChild(title);

          // Add course name if available
          if (item.context_name) {
            const course = document.createElement("div");
            course.textContent = item.context_name;
            course.style.fontSize = "0.8em";
            course.style.color = "#666";
            titleDiv.appendChild(course);
          }

          // Create due date div with priority indicator
          const dueDiv = document.createElement("div");
          dueDiv.style.textAlign = "right";
          dueDiv.style.minWidth = "100px";

          // Add priority indicator if within 7 days
          if (item.isPriority) {
            const priorityIndicator = document.createElement("span");
            priorityIndicator.textContent = "⚠️ ";
            priorityIndicator.title = "Due soon!";
            dueDiv.appendChild(priorityIndicator);
          }

          // Add due date text
          const dueText = document.createElement("span");
          if (item.daysUntilDue === 0) {
            dueText.textContent = "Due Today";
            dueText.style.color = "#ff4444";
          } else if (item.daysUntilDue === 1) {
            dueText.textContent = "Due Tomorrow";
            dueText.style.color = "#ff8800";
          } else {
            dueText.textContent = `Due in ${item.daysUntilDue} days`;
            dueText.style.color = item.isPriority ? "#ff8800" : "#666";
          }
          dueDiv.appendChild(dueText);

          // Add elements to list item
          listItem.appendChild(titleDiv);
          listItem.appendChild(dueDiv);

          // Add priority styling
          if (item.isPriority) {
            listItem.style.backgroundColor = "rgba(255, 136, 0, 0.1)";
            listItem.style.borderRadius = "5px";
            listItem.style.padding = "10px";
          }

          assignmentsList.appendChild(listItem);
        });
      } else {
        assignmentsList.innerHTML =
          "<li>No upcoming assignments or quizzes</li>";
      }

      // Process announcements
      const announcementItems = plannable.filter(
        (item) => item.plannable_type === "announcement"
      );
      if (announcementItems.length > 0) {
        announcementItems.forEach((item) => {
          const listItem = document.createElement("li");
          listItem.textContent =
            item.plannable.title || item.plannable.name || "No Title";
          announcementsList.appendChild(listItem);
        });
      } else {
        announcementsList.innerHTML = "<li>No announcements</li>";
      }
    }
  });
}

// Rest of your existing code for event listeners remains the same...
document.addEventListener("DOMContentLoaded", function () {
  loadData();

  // Add click handlers for expandable sections
  document.querySelectorAll(".section-header").forEach((header) => {
    header.addEventListener("click", function () {
      const content = this.nextElementSibling;
      const button = this.querySelector(".expand-button");

      // Toggle content
      const isExpanded = content.classList.toggle("active");

      // Update button text
      button.textContent = isExpanded ? "−" : "+";
    });
  });

  // Add refresh functionality through Chrome storage updates
  chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace === "local" && (changes.classes || changes.plannable)) {
      loadData();
    }
  });
});
