// Variables globales
let isPlaying = false;
let player = null;
let playerReady = false;
let currentSlide = 0;
let totalSlides = 0;
let enableMusic = false;

// Funciones globales para los botones del modal
function enterWithMusicClick() {
    // console.log('Función enterWithMusicClick() ejecutada');
    enableMusic = true;
    const modal = document.getElementById('welcomeModal');
    if (modal) {
        modal.style.display = 'none';
    }

    // El player se precarga desde DOMContentLoaded (ver loadYouTubeAPI más abajo),
    // así que si ya está listo llamamos playVideo() de inmediato, dentro del mismo
    // tick del click. Eso es justo lo que iOS Safari exige para permitir el audio;
    // si el player se crea o se reproduce de forma asíncrona (fuera del gesto del
    // usuario), iOS lo bloquea en silencio y por eso antes no sonaba en iPhone.
    if (playerReady && player) {
        document.getElementById('musicPlayer').style.display = 'block';
        player.unMute();
        player.setVolume(100);
        player.playVideo();
        isPlaying = true;
        updateMusicIcon();
        // En iOS/Safari a veces el primer playVideo() no arranca el audio
        // aunque sí "conecta" el gesto; reintentamos una vez, todavía
        // dentro del mismo ciclo de interacción del usuario.
        setTimeout(() => {
            if (player && typeof player.getPlayerState === 'function' && player.getPlayerState() !== 1) {
                player.unMute();
                player.playVideo();
            }
        }, 300);
    }
    // Si el player todavía no está listo (conexión lenta), onPlayerReady se
    // encarga de reproducir apenas termine de inicializar.
}

function enterWithoutMusicClick() {
    // console.log('Función enterWithoutMusicClick() ejecutada');
    enableMusic = false;
    const modal = document.getElementById('welcomeModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Función para configurar los botones directamente
function setupModalButtons() {
    const enterWithMusic = document.getElementById('enterWithMusic');
    const enterWithoutMusic = document.getElementById('enterWithoutMusic');
    const modal = document.getElementById('welcomeModal');

    // console.log('Configurando botones del modal...', { enterWithMusic, enterWithoutMusic, modal });

    if (enterWithMusic) {
        enterWithMusic.onclick = function() {
            // console.log('Botón CON música clickeado');
            enableMusic = true;
            if (modal) {
                modal.style.display = 'none';
            }
            // Mismo arreglo que en enterWithMusicClick: reproducir de forma
            // síncrona dentro del click si el player ya está precargado.
            if (playerReady && player) {
                const musicPlayer = document.getElementById('musicPlayer');
                if (musicPlayer) musicPlayer.style.display = 'block';
                player.unMute();
                player.setVolume(100);
                player.playVideo();
                isPlaying = true;
                updateMusicIcon();
                setTimeout(() => {
                    if (player && typeof player.getPlayerState === 'function' && player.getPlayerState() !== 1) {
                        player.unMute();
                        player.playVideo();
                    }
                }, 300);
            }
        };
    }

    if (enterWithoutMusic) {
        enterWithoutMusic.onclick = function() {
            // console.log('Botón SIN música clickeado');
            enableMusic = false;
            if (modal) {
                modal.style.display = 'none';
            }
        };
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initializeCountdown();
    initializeCarousel();
    initializeIntro();
    const musicToggle = document.getElementById('musicToggle');
    if (musicToggle) musicToggle.addEventListener('click', toggleMusic);
    const audio = document.getElementById('bgMusic');
    if (audio) {
        audio.addEventListener('playing', () => { isPlaying = true; updateMusicIcon(); });
        audio.addEventListener('pause', () => { isPlaying = false; updateMusicIcon(); });
    }
});

// =========================================================
// Intro con el video de la puerta.
// El toque del invitado es la interacción que arranca todo: el video
// (con su sonido) y la música de fondo, en el mismo gesto, que es lo que
// exigen iPhone y Android para dejar sonar el audio.
// En el segundo 3 se apaga el sonido del video y queda solo la música.
// Al terminar, la luz dorada del final se disuelve sobre la portada.
// =========================================================
const VIDEO_SONIDO_HASTA = 3;

function initializeIntro() {
    const intro = document.getElementById('introVideo');
    const video = document.getElementById('doorVideo');
    const audio = document.getElementById('bgMusic');
    const root = document.documentElement;
    if (!intro || !video) { root.classList.remove('intro-lock'); return; }

    let started = false, finished = false;

    const finish = () => {
        if (finished) return;
        finished = true;
        window.scrollTo(0, 0);
        intro.classList.add('is-leaving');           // la luz se disuelve
        root.classList.remove('intro-lock');
        root.classList.add('intro-done');            // entra la portada
        setTimeout(() => intro.remove(), 2000);
        subirMusica(audio);
    };

    const start = () => {
        if (started) return;
        started = true;
        enableMusic = true;
        intro.classList.add('is-playing');
        const mp = document.getElementById('musicPlayer');
        if (mp) mp.style.display = 'block';

        // 1) Música: arranca en este mismo toque
        if (audio) {
            try { audio.currentTime = 0; } catch (e) {}
            audio.muted = false;
            try { audio.volume = 0.55; } catch (e) {}   // suave mientras suena la puerta
            const pa = audio.play();
            if (pa && pa.catch) pa.catch(() => {});
        }

        // 2) Video con su sonido solo hasta el segundo 3
        video.muted = false;
        try { video.volume = 1; } catch (e) {}
        let silenciado = false;
        const silenciar = () => {
            if (silenciado) return;
            silenciado = true;
            apagarSonido(video);
            subirMusica(audio);
        };
        video.addEventListener('timeupdate', function onT() {
            if (video.currentTime >= VIDEO_SONIDO_HASTA) {
                video.removeEventListener('timeupdate', onT);
                silenciar();
            }
        });
        setTimeout(silenciar, (VIDEO_SONIDO_HASTA + 1) * 1000);   // respaldo

        const pv = video.play();
        if (pv && pv.catch) {
            pv.catch(() => {
                video.muted = true;
                video.play().catch(() => finish());
            });
        }
        // Empieza la transición un poco antes del final, sobre la luz dorada
        video.addEventListener('timeupdate', function nearEnd() {
            if (isFinite(video.duration) && video.currentTime >= video.duration - 0.6) {
                video.removeEventListener('timeupdate', nearEnd);
                finish();
            }
        });
        video.addEventListener('ended', finish);
        const dur = isFinite(video.duration) && video.duration > 0 ? video.duration : 8;
        setTimeout(finish, (dur + 2.5) * 1000);   // red de seguridad

        // Si el teléfono no dejó sonar la música, el próximo toque la arranca
        const retry = () => {
            if (!audio || !audio.paused || userPausedMusic) {
                ['click', 'touchend'].forEach(ev => document.removeEventListener(ev, retry, true));
                return;
            }
            audio.play().catch(() => {});
        };
        setTimeout(() => ['click', 'touchend'].forEach(ev => document.addEventListener(ev, retry, true)), 600);
    };

    intro.addEventListener('click', start);
    intro.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); }
    });
    if (video.error) video.addEventListener('click', finish);
    video.addEventListener('error', () => { if (started) finish(); });
}

let userPausedMusic = false;

// Apaga el sonido del video con un desvanecido corto (en iPhone se silencia directo)
function apagarSonido(video) {
    if (!video || video.muted) return;
    let v = video.volume;
    const fade = setInterval(() => {
        v = Math.max(0, v - 0.1);
        try { video.volume = v; } catch (e) {}
        if (v <= 0) { clearInterval(fade); video.muted = true; }
    }, 40);
}

// Sube la música a volumen completo poco a poco
function subirMusica(audio) {
    if (!audio || userPausedMusic) return;
    if (audio.paused) audio.play().catch(() => {});
    let v = audio.volume;
    const fade = setInterval(() => {
        v = Math.min(1, v + 0.05);
        try { audio.volume = v; } catch (e) {}
        if (v >= 1) clearInterval(fade);
    }, 80);
}

function toggleMusic() {
    const audio = document.getElementById('bgMusic');
    if (!audio) return;
    if (audio.paused) {
        userPausedMusic = false;
        audio.play().catch(() => {});
    } else {
        userPausedMusic = true;
        audio.pause();
    }
}

function updateMusicIcon() {
    const volumeIcon = document.getElementById('volumeIcon');
    if (volumeIcon) {
        if (isPlaying) {
            volumeIcon.innerHTML = `
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#A95F73" stroke="#fff" stroke-width="1"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.08" stroke="#A95F73" stroke-width="2"></path>
                <circle cx="6.5" cy="12" r="1" fill="#D98FA3"/>
            `;
        } else {
            volumeIcon.innerHTML = `
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#A95F73" stroke="#fff" stroke-width="1"></polygon>
                <line x1="19" y1="9" x2="17" y2="11" stroke="#ff6b6b" stroke-width="2"></line>
                <line x1="17" y1="9" x2="19" y2="11" stroke="#ff6b6b" stroke-width="2"></line>
                <circle cx="6.5" cy="12" r="1" fill="#ff6b6b"/>
            `;
        }
    }
}

// Countdown
function initializeCountdown() {
    const targetDate = new Date('2026-11-20T18:30:00').getTime();
    
    function updateCountdown() {
        const now = new Date().getTime();
        const difference = targetDate - now;
        
        if (difference > 0) {
            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);
            
            document.getElementById('days').textContent = days.toString().padStart(2, '0');
            document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
            document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
            document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
        } else {
            document.getElementById('days').textContent = '00';
            document.getElementById('hours').textContent = '00';
            document.getElementById('minutes').textContent = '00';
            document.getElementById('seconds').textContent = '00';
        }
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// Carrusel
function initializeCarousel() {
    const track = document.getElementById('carouselTrack');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');

    if (!track) return;

    // calcular total dinámicamente
    const items = track.querySelectorAll('.carousel-item');
    totalSlides = items.length;
    const totalSlidesElement = document.getElementById('totalSlides');
    if (totalSlidesElement) totalSlidesElement.textContent = totalSlides;

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentSlide = (currentSlide + 1) % totalSlides;
            updateCarousel();
        });
    }
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
            updateCarousel();
        });
    }

    // Ajuste inicial para asegurar cálculo correcto tras el render
    updateCarousel();
    requestAnimationFrame(updateCarousel);
    setTimeout(updateCarousel, 200);

    // Auto-play del carrusel
    setInterval(() => {
        nextSlide();
    }, 2500);
}

function updateCarousel() {
    const track = document.getElementById('carouselTrack');
    if (track) {
        const items = track.querySelectorAll('.carousel-item');
        if (!items.length) return;
        const container = track.parentElement;

        // Temporarily reset transform to measure actual positions
        const previousTransform = track.style.transform;
        track.style.transform = 'none';

        const firstRect = items[0].getBoundingClientRect();
        const secondRect = items[1] ? items[1].getBoundingClientRect() : null;
        const stepWidth = Math.max(1, secondRect ? Math.round(secondRect.left - firstRect.left) : Math.round(firstRect.width));

        const containerWidth = Math.round(container.getBoundingClientRect().width);
        const visibleCount = Math.max(1, Math.floor((containerWidth + 1) / stepWidth));
        const maxIndex = Math.max(0, totalSlides - visibleCount);

        // Detecta si hay que dar la vuelta (de la última foto a la 1, o viceversa)
        let wrapped = false;
        if (currentSlide > maxIndex) { currentSlide = 0; wrapped = true; }
        if (currentSlide < 0) { currentSlide = maxIndex; wrapped = true; }

        const trackRect = track.getBoundingClientRect();
        const baseLeft = Math.round(firstRect.left - trackRect.left);
        const translateXpx = -Math.round(baseLeft + (currentSlide * stepWidth));

        if (wrapped) {
            // Al dar la vuelta, salta directo a la foto 1 sin animar el regreso
            // (evita el efecto de "devolverse" deslizando hacia atrás por todas las fotos)
            const prevTransition = track.style.transition;
            track.style.transition = 'none';
            track.style.transform = `translateX(${translateXpx}px)`;
            void track.offsetWidth; // fuerza reflow para aplicar el salto sin animación
            track.style.transition = prevTransition || '';
        } else {
            // Apply transform
            track.style.transform = `translateX(${translateXpx}px)`;
        }
        // console.log('Carousel moved to slide:', { currentSlide, visibleCount, maxIndex, translateXpx, stepWidth, baseLeft });
    }
    updateSlideCounter();
    markCenterCarouselItem();
}

function nextSlide() {
    currentSlide++;
    updateCarousel();
}

function previousSlide() {
    currentSlide--;
    updateCarousel();
}

function updateSlideCounter() {
    const currentSlideElement = document.getElementById('currentSlide');
    const totalSlidesElement = document.getElementById('totalSlides');
    if (currentSlideElement) currentSlideElement.textContent = (currentSlide + 1);
    if (totalSlidesElement) totalSlidesElement.textContent = totalSlides;
}

// Mark center carousel item on desktop
function markCenterCarouselItem() {
    const track = document.getElementById('carouselTrack');
    if (!track) return;
    const items = Array.from(track.querySelectorAll('.carousel-item'));
    if (!items.length) return;
    items.forEach(it => it.classList.remove('is-center'));

    const firstItem = items[0];
    const container = track.parentElement;
    const itemWidth = firstItem.getBoundingClientRect().width;
    const containerWidth = container.getBoundingClientRect().width;
    const visibleCount = Math.max(1, Math.floor(containerWidth / itemWidth));

    const centerIndex = (currentSlide + Math.floor(visibleCount / 2)) % items.length;
    items[centerIndex].classList.add('is-center');
}

// Hook into carousel updates
const _origUpdateCarousel = typeof updateCarousel === 'function' ? updateCarousel : null;
if (_origUpdateCarousel) {
    window.updateCarousel = function() {
        _origUpdateCarousel();
        markCenterCarouselItem();
    };
}

window.addEventListener('resize', markCenterCarouselItem);

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(markCenterCarouselItem, 200);
});

// Funciones de los botones
function openLocation(location) {
    // Enlaces de ejemplo (dirección ficticia) - ceremonia y celebración
    const mapsUrls = {
        ceremony: "https://maps.app.goo.gl/zJzudzb3Ge8ict166",
        reception: "https://maps.app.goo.gl/zJzudzb3Ge8ict166"
    };
    const mapsUrl = mapsUrls[location] || mapsUrls.ceremony;
    window.open(mapsUrl, '_blank');
}

// NOTA: esta es una plantilla de ejemplo. Reemplaza el contenido de estas
// funciones con tu propio enlace (Google Drive, Google Form, lista de
// regalos, etc.) cuando personalices la invitación.

function sharePhotos() {
    window.open('https://photos.app.goo.gl/m5Kn7htCGSmSteeF6', '_blank');
}

function showDressCode() {
    const modal = document.getElementById('dresscodeModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeDressCodeModal() {
    // El click dentro de la tarjeta del modal usa stopPropagation(), así que
    // esta función solo se dispara al hacer click en el fondo oscuro o en la X.
    const modal = document.getElementById('dresscodeModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showGifts() {
    window.open('https://cuentapro11.github.io/numero-cuenta-ejemplo/', '_blank');
}

function confirmAttendance() {
    window.open('https://wa.me/18298087223?text=Confirmo%20mi%20asistencia%20a%20los%20XV%20a%C3%B1os%20de%20Nahomy%20Lucianny%20Cueto', '_blank');
}

// Sistema de Toast
function showToast(title, message) {
    const toast = document.getElementById('toast');
    const toastContent = document.getElementById('toastContent');
    
    toastContent.innerHTML = `
        <h4 style="font-weight: 700; color: #fff; margin-bottom: 0.35rem; letter-spacing: 0.2px;">${title}</h4>
        <p style="color: #ddd;">${message}</p>
    `;
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// Nota: el efecto de portada ahora se logra 100% con CSS (hero fijo detrás
// del contenido, ver .hero-section y .content en CCSB.css), igual que en
// boda100L. Ya no hace falta mover nada por JS en el scroll.


// Forzar limpieza de caches en clientes antiguos
(function() {
  function clearCaches() {
    if ('caches' in window) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(reg => reg.unregister());
      }).catch(() => {});
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', clearCaches);
  } else {
    clearCaches();
  }
})();
