document.addEventListener('DOMContentLoaded', () => {
    const themeCheckbox = document.getElementById('themeCheckbox');
    const body = document.body;

    const initTheme = () => {
        const savedTheme = localStorage.getItem('tally_theme') || 'dark';
        if (savedTheme === 'light') {
            body.classList.add('light-theme');
            if (themeCheckbox) themeCheckbox.checked = true;
        } else {
            body.classList.remove('light-theme');
            if (themeCheckbox) themeCheckbox.checked = false;
        }
    };

    const toggleTheme = () => {
        const isLight = body.classList.toggle('light-theme');
        const theme = isLight ? 'light' : 'dark';
        localStorage.setItem('tally_theme', theme);
        
        // Ensure checkbox stays in sync if triggered by JS
        if (themeCheckbox) themeCheckbox.checked = isLight;
        
        // Dispatch event for components that need to re-render (like Chart.js)
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    };

    if (themeCheckbox) {
        themeCheckbox.addEventListener('change', toggleTheme);
    }
    
    initTheme();
});
