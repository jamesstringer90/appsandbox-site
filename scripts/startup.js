window.startCodexPresentation?.();

requestAnimationFrame(() => {
    window.arrangeDesktop?.();
    requestAnimationFrame(() => document.documentElement.classList.remove("presentation-loading"));
});
