// Dev indicator popover functionality
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    const indicator = document.getElementById('devIndicator');
    const popover = document.getElementById('devPopover');

    if (!indicator || !popover) return;

    // Toggle popover on click
    indicator.addEventListener('click', function(e) {
      e.stopPropagation();
      popover.classList.toggle('active');
    });

    // Close popover when clicking outside
    document.addEventListener('click', function(e) {
      if (!popover.contains(e.target) && e.target !== indicator) {
        popover.classList.remove('active');
      }
    });

    // Prevent popover from closing when clicking inside it
    popover.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  });
})();
