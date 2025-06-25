(async function() {
    class Effects {
        constructor() {
            this.heroId = "hero-image";
            this.parallaxClass = "parallax";
        }

        async init() {
            const heroElement = document.getElementById(this.heroId);
            if (heroElement && heroElement.classList.contains(this.parallaxClass)) {
                await this.setHeroParallax();
            }
        }

        parallaxAction() {
            let scrolledHeight = window.pageYOffset;
            let hero = document.getElementById(this.heroId);

            const limit = hero.offsetTop + hero.offsetHeight * 2;
            if (scrolledHeight > hero.offsetTop) {
                hero.style.transform = "translateY(" + (scrolledHeight - hero.offsetTop) / 2 + "px)";
            } else if (scrolledHeight <= hero.offsetTop) {
                hero.style.transform = "translateY(0)";
            }
        }

        async setHeroParallax() {
            let self = this;
            let timeout;

            window.addEventListener("scroll", function(event) {
                // If there's a timer, cancel
                if (timeout) {
                    window.cancelAnimationFrame(timeout);
                }
                // Setup the new requestAnimationFrame()
                timeout = window.requestAnimationFrame(function() {
                    // Run our scroll functions
                    self.parallaxAction();
                });
            }, false);
        }


    }

    document.addEventListener('DOMContentLoaded', async() => await init())

    async function init() {
        const ux = new Effects();
        await ux.init();
    }

})()