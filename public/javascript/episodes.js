(async function() {
    class Episodes {
        constructor() {
            this.everPlayer = new EverPlayer();
            // this.searchEl.toggleAttribute('active')
            // this.searchEl.addEventListener('focus', this.activate.bind(this))
            // this.episodeEl.addEventListener('click', this.showDetails.bind(this))
        }

        async init() {
            if (location.pathname == '/' || location.pathname.includes('home')) {
                await this.initHomePage()
            } else if (location.pathname.includes('episode')) {
                await this.initPlayer()
            }
            // Always ensure global access to player for cross-page continuity
            window.globalEverPlayer = this.everPlayer;
        }

        async initPlayer(episode) {
            const player = new Player(document.querySelector('.player'), window.currentEpisode, this.everPlayer);
        }

        async initHomePage() {
            Array.from(this.episodeEl).forEach((element) => {
                element.addEventListener('click', async() => {
                    await this.showDetails.bind(this, element)(true);
                })
            });

            // Add progress indicators
            this.addProgressIndicators();

            // Показать самый свежий эпизод
            this.showDetails(this.episodeEl[0], false);
        }

        get episodeEl() {
            if (!this.episodeEl_) {
                this.episodeEl_ = document.getElementsByClassName("show-episode")
            }
            return this.episodeEl_
        }

        async getEpisode(id) {
            return await fetch('/api/episode/' + id)
                .then(async(response) => {
                    return await response.json()
                })
                .then(async(json) => {
                    return await json
                })
        }

        async showDetails(el, scrollView) {
            const li = el.parentNode.parentNode;
            const id = li.getAttribute('data-episode-num');
            const box = li.getElementsByClassName("selected-box")[0]

            if (this.currentEp) {
                const oldEl = document.querySelector(`[data-episode-num='${this.currentEp}']`)
                const oldBox = oldEl.getElementsByClassName("selected-box")[0]
                oldBox.innerHTML = ''
                oldEl.classList.remove('selected');
            }

            this.currentEp = id;

            const episode = await this.getEpisode(id);

            if (!li.classList.contains('selected')) {
                box.appendChild(this.constructElement(episode));
                li.classList.add('selected');

                if (scrollView) {
                    li.scrollIntoView({ behavior: "smooth" })
                }
            } else {
                li.classList.remove('selected');
            }

            const player = new Player(li, episode, this.everPlayer);
        }

        addProgressIndicators() {
            Array.from(this.episodeEl).forEach((element) => {
                const li = element.parentNode.parentNode;
                const episodeNum = li.getAttribute('data-episode-num');
                const saved = localStorage.getItem(`episode_progress_${episodeNum}`);

                if (saved) {
                    try {
                        const progress = JSON.parse(saved);
                        // Only show indicator if saved within last 30 days
                        if (Date.now() - progress.timestamp < 30 * 24 * 60 * 60 * 1000) {
                            const indicator = document.createElement('span');
                            indicator.className = 'progress-indicator';
                            indicator.innerHTML = '●';
                            indicator.style.cssText = 'color: #007bff; font-size: 8px; margin-left: 4px; opacity: 0.7;';
                            indicator.title = `Продолжить с ${Math.floor(progress.currentTime / 60)}:${Math.floor(progress.currentTime % 60).toString().padStart(2, '0')}`;

                            const episodeNum = li.querySelector('.episode-num');
                            if (episodeNum && !episodeNum.querySelector('.progress-indicator')) {
                                episodeNum.appendChild(indicator);
                            }
                        }
                    } catch (e) {
                        console.warn('Failed to parse progress:', e);
                    }
                }
            });
        }

        constructElement(episode) {
            const fragment = document.createElement('div'),
                href = '/episodes/' + episode.episodeNum;

            // Build tags HTML if they exist
            let tagsHtml = '';
            if (episode.tags && episode.tags.length > 0) {
                const tagElements = episode.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
                tagsHtml = `<div class="episode-tags my-4">${tagElements}</div>`;
            }

            const template = `<h3><span class="episode-num">№${episode.episodeNum}</span> <a href="${href}">${episode.title}</a> <span class="small-caps date">${episode.pubDateConverted}</span></h3>
                        <h4>${episode['itunes:subtitle']}</h4>
                        ${tagsHtml}
                        <section class="episode-desc">${episode.description}</section>
                        <div class="player">
                          <div class="btn-play">Play</div>
                        </div>`;
            fragment.innerHTML = template;
            return fragment;
        }
    }

    document.addEventListener('DOMContentLoaded', async() => await init())

    async function init() {
        const ep = new Episodes();
        await ep.init();
    }

})()