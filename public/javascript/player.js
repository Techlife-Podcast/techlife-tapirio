class Player {
  constructor (element, episode, everPlayer) {
    this.everPlayer = everPlayer;
    this.source = episode.enclosure.$.url;
    this.episode = episode;
    //this.audioPlayerEl = element.querySelector('#player')
    this.controls = {
      play: element.querySelector('.btn-play'),
    }
    this.started = false;
    this.controls.play.addEventListener('click', () => {
      if (!this.started) {
        everPlayer.source = episode.enclosure.$.url;
        everPlayer.title = episode.episodeNum + ': ' + episode.title;
        everPlayer.setEpisodeId(episode.episodeNum);
      }
      if (this.isPlaying) {
        this.everPlayer.pause()
      } else {
        this.everPlayer.play()
      }
      this.isPlaying = !this.isPlaying;
      this.controls.play.setAttribute('data-is-playing', this.isPlaying);
      this.started = true;
    });
  }  
}

class EverPlayer {
  constructor () {
    // console.log(element);
    this.container = document.querySelector('.player-wrapper')
    this.player = this.container.querySelector('#player')
    this.player.addEventListener('timeupdate', () => this.updateBar())
    this.player.addEventListener('timeupdate', () => this.saveProgress())
    this.audioLoaded = false
    this.currentEpisodeId = null
    
    // Check for active playback state on page load
    this.checkForActivePlayback()
    
    this.controls = {
      play: this.container.querySelector('.btn-play'),
      bar: this.container.querySelector('.progress-bard'),
      soFar: this.container.querySelector('.so-far'),
      title: this.container.querySelector('.title'),
      timeDisplay: this.container.querySelector('.time-display'),
      speedControl: this.container.querySelector('.speed-control')
    }
    
    // Initialize playback speed
    this.playbackSpeeds = [1, 1.25, 1.5, 1.75, 2];
    this.currentSpeedIndex = 0;
    this.player.playbackRate = this.playbackSpeeds[this.currentSpeedIndex];
    
    this.player.addEventListener('canplay', () => {
      this.audioLoaded = true
      this.container.classList.add("active")
      this.controls.title.innerHTML = this.title
    })

    this.controls.play.addEventListener('click', () => {
      if (this.isPlaying) {
        this.pause()
      } else {
        this.play()
      }
    })

    this.player.addEventListener('ended', (event) => {
      this.pause()
    })

    // настроить функционал выбора позиции времени на прогресс-баре
    this.controls.bar.addEventListener('click', (e) => {
      const percentagePlayed = e.offsetX / this.controls.bar.offsetWidth * 100
      if (this.audioLoaded) {
        this.player.currentTime = this.player.duration / 100 * percentagePlayed;
      }
    })

    // Speed control functionality
    this.controls.speedControl.addEventListener('click', () => {
      this.cyclePlaybackSpeed();
    })
  }  
  set source(s) {
    this.player.setAttribute('src', s);
  }
  
  setEpisodeId(episodeId) {
    this.currentEpisodeId = episodeId;
    this.restoreProgress();
  }
  
  saveProgress() {
    if (!this.currentEpisodeId || !this.player.duration) return;
    
    const progress = {
      currentTime: this.player.currentTime,
      duration: this.player.duration,
      timestamp: Date.now()
    };
    
    // Only save if we're more than 5 seconds in and not near the end
    if (progress.currentTime > 5 && progress.currentTime < progress.duration - 10) {
      localStorage.setItem(`episode_progress_${this.currentEpisodeId}`, JSON.stringify(progress));
    }
    
    // Save current playback state for cross-page continuity
    if (this.isPlaying) {
      const playbackState = {
        episodeId: this.currentEpisodeId,
        currentTime: this.player.currentTime,
        isPlaying: true,
        title: this.title,
        timestamp: Date.now()
      };
      localStorage.setItem('current_playback_state', JSON.stringify(playbackState));
    }
  }
  
  restoreProgress() {
    if (!this.currentEpisodeId) return;
    
    const saved = localStorage.getItem(`episode_progress_${this.currentEpisodeId}`);
    if (saved) {
      try {
        const progress = JSON.parse(saved);
        // Auto-restore if saved within last 30 days
        if (Date.now() - progress.timestamp < 30 * 24 * 60 * 60 * 1000) {
          this.player.addEventListener('canplay', () => {
            this.player.currentTime = progress.currentTime;
          }, { once: true });
        }
      } catch (e) {
        console.warn('Failed to restore progress:', e);
      }
    }
  }
  play() {
    this.player.play();
    this.isPlaying = true;
    this.controls.play.setAttribute('data-is-playing', true);
  }
  pause() {
    this.player.pause();
    this.isPlaying = false;
    this.controls.play.setAttribute('data-is-playing', false);
    // Clear active playback state when paused
    localStorage.removeItem('current_playback_state');
  }
  
  checkForActivePlayback() {
    const activeState = localStorage.getItem('current_playback_state');
    if (activeState) {
      try {
        const state = JSON.parse(activeState);
        // Auto-continue if playback was active within last 5 minutes
        if (Date.now() - state.timestamp < 5 * 60 * 1000) {
          this.autoResume(state);
        } else {
          localStorage.removeItem('current_playback_state');
        }
      } catch (e) {
        console.warn('Failed to parse active playback state:', e);
        localStorage.removeItem('current_playback_state');
      }
    }
  }
  
  async autoResume(state) {
    try {
      // Get episode data to resume playback
      const response = await fetch(`/api/episode/${state.episodeId}`);
      const episode = await response.json();
      
      // Set up the player
      this.source = episode.enclosure.$.url;
      this.title = state.title;
      this.setEpisodeId(state.episodeId);
      
      // Wait for audio to load then prepare for resume
      this.player.addEventListener('canplay', () => {
        this.player.currentTime = state.currentTime;
        this.container.classList.add("active");
        this.controls.title.innerHTML = this.title;
        
        // Try to auto-play, but fallback gracefully if blocked
        const playPromise = this.player.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            // Auto-play succeeded
            this.isPlaying = true;
            this.controls.play.setAttribute('data-is-playing', true);
          }).catch(() => {
            // Auto-play was blocked, prepare for manual play
            this.isPlaying = false;
            this.controls.play.setAttribute('data-is-playing', false);
            console.log('Auto-play blocked, ready for manual play');
          });
        }
      }, { once: true });
      
    } catch (error) {
      console.warn('Failed to auto-resume playback:', error);
      localStorage.removeItem('current_playback_state');
    }
  }
  formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '--:--';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  cyclePlaybackSpeed() {
    this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.playbackSpeeds.length;
    const newSpeed = this.playbackSpeeds[this.currentSpeedIndex];
    this.player.playbackRate = newSpeed;
    
    // Update button text
    if (newSpeed === 1) {
      this.controls.speedControl.textContent = '1×';
    } else {
      this.controls.speedControl.textContent = `${newSpeed}×`;
    }
  }

  updateBar() {
    const progress = this.player.currentTime / this.player.duration * 100;
    this.controls.soFar.style.width = progress + '%';
    
    // Update time display: current (total)
    const currentTime = this.formatTime(this.player.currentTime);
    const totalTime = this.formatTime(this.player.duration);
    this.controls.timeDisplay.textContent = `${currentTime} (${totalTime})`;
  }
}
