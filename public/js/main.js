
// Sidebar toggle functionality
$(document).ready(function() {
    $("#sidebarToggle").on("click", function(e) {
        e.preventDefault();
        $("body").toggleClass("sb-sidenav-toggled");
    });
});
