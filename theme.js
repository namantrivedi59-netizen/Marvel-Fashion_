(function(){
  var STORAGE_KEY = 'mf-theme';
  var root = document.documentElement;

  function applyTheme(theme){
    if (theme === 'dark'){
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }

  function currentTheme(){
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function toggleTheme(){
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
  }

  function init(){
    var toggles = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < toggles.length; i++){
      toggles[i].addEventListener('click', toggleTheme);
    }

    // Keep in sync if the user changes it in another tab.
    window.addEventListener('storage', function(e){
      if (e.key === STORAGE_KEY) applyTheme(e.newValue);
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
