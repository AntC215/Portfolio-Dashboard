function toggleSidebar() {
    document.body.classList.toggle('sidebar-open'); // Toggle the sidebar-open class on the body
    
    // Toggle button icon
    var toggleButton = document.getElementById("toggle-btn");
    if (document.body.classList.contains('sidebar-open')) {
        toggleButton.textContent = "✖"; // Change to X when sidebar is open
    } else {
        toggleButton.textContent = "☰"; // Change back to hamburger when sidebar is closed
    }
}

document.addEventListener("DOMContentLoaded", function () {
    var dropdowns = document.getElementsByClassName("dropdown-btn");

    for (var i = 0; i < dropdowns.length; i++) {
        dropdowns[i].addEventListener("click", function () {
            this.classList.toggle("active");
            var dropdownContent = this.nextElementSibling;
            if (dropdownContent.style.display === "block") {
                dropdownContent.style.display = "none";
            } else {
                dropdownContent.style.display = "block";
            }
        });
    }
});
