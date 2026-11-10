/* =========================================================
   BURBUJAS.JS — Burbujas de jabón que suben dentro de cada
   sección (se mueven con la página, no pegadas a la pantalla)
   y destellos dorados en la portada y la bienvenida.
   ========================================================= */
(function () {
    'use strict';

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Cada tono define el reflejo del borde de la burbuja: [claro, intenso, toque]
    var TONOS = [
        { peso: 3, c: ['#F6E7B5', '#B8892F', '#D98FA3'] }, // oro
        { peso: 3, c: ['#F8C9D6', '#B86C82', '#C9A24B'] }, // rosa malva
        { peso: 2, c: ['#FFFFFF', '#C9A24B', '#B9A0D6'] }, // perla irisada
        { peso: 2, c: ['#FBE3CC', '#C98A5E', '#D98FA3'] }  // champaña rosado
    ];
    var BOLSA = [];
    TONOS.forEach(function (t) { for (var i = 0; i < t.peso; i++) BOLSA.push(t); });
    var INTERCALADO = [TONOS[1], TONOS[0]]; // rosa malva, oro

    // Secciones donde viven burbujas
    var SELECTOR = '.hero-section, .countdown-section, .events-section, .gallery-section, ' +
                   '.party-section, .gifts-section, .rsvp-section, .footer';

    var contador = 0;
    var capas = [];
    var iniciado = false;

    function azar(min, max) { return min + Math.random() * (max - min); }
    function esMovil() { return window.innerWidth < 600; }

    function svgBurbuja(t, id) {
        var g = 'bb' + id;
        return '' +
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
          '<defs>' +
            '<radialGradient id="' + g + 'c" cx="50%" cy="50%" r="50%">' +
              '<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.03"/>' +
              '<stop offset="0.68" stop-color="#FFFFFF" stop-opacity="0.08"/>' +
              '<stop offset="0.8" stop-color="' + t.c[0] + '" stop-opacity="0.28"/>' +
              '<stop offset="0.94" stop-color="' + t.c[1] + '" stop-opacity="0.45"/>' +
              '<stop offset="1" stop-color="' + t.c[1] + '" stop-opacity="0.75"/>' +
            '</radialGradient>' +
            '<linearGradient id="' + g + 'r" x1="0" y1="0" x2="1" y2="1">' +
              '<stop offset="0" stop-color="' + t.c[1] + '"/>' +
              '<stop offset="0.35" stop-color="' + t.c[0] + '"/>' +
              '<stop offset="0.65" stop-color="' + t.c[2] + '"/>' +
              '<stop offset="1" stop-color="' + t.c[1] + '"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<circle cx="50" cy="50" r="47" fill="url(#' + g + 'c)" stroke="url(#' + g + 'r)" stroke-width="2.4" stroke-opacity="0.95"/>' +
          '<path d="M24 38 C26 27 34 20 44 18" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.8"/>' +
          '<circle cx="22" cy="48" r="2.6" fill="#FFFFFF" opacity="0.7"/>' +
          '<path d="M64 82 C74 78 81 70 84 60" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" opacity="0.4"/>' +
          '<circle cx="70" cy="28" r="1.8" fill="' + t.c[1] + '" opacity="0.75"/>' +
        '</svg>';
    }

    // Cuántas burbujas caben a la vez en una sección según su alto
    function maximo(c) {
        var porAlto = c.alto / (esMovil() ? 75 : 60);
        return Math.max(5, Math.min(esMovil() ? 14 : 20, Math.round(porAlto)));
    }

    function medir(c) {
        c.alto = c.capa.clientHeight || c.seccion.offsetHeight || 600;
        c.capa.style.setProperty('--h', c.alto + 'px');
    }

    // adelanto: 0 = nace abajo; 0.5 = ya va por la mitad de la sección
    function lanzar(c, adelanto) {
        if (document.hidden || c.activas >= maximo(c)) return;

        var id = ++contador;
        // Colores intercalados: rosa, oro, rosa, oro… dentro de cada sección
        var t = INTERCALADO[c.turno++ % INTERCALADO.length];
        var r = Math.random();
        var tam = r < 0.55 ? azar(12, 26) : (r < 0.88 ? azar(26, 44) : azar(44, 66));
        if (esMovil()) tam *= 0.85;

        // Velocidad en px/s: igual de suave en secciones cortas y largas
        var velocidad = Math.max(azar(45, 75) - tam * 0.25, 25);
        var dur = (c.alto + tam) / velocidad;

        var b = document.createElement('div');
        b.className = 'burbuja';
        b.style.setProperty('--x', azar(1, 95).toFixed(1) + '%');
        b.style.setProperty('--w', tam.toFixed(0) + 'px');
        b.style.setProperty('--dur', dur.toFixed(1) + 's');
        b.style.setProperty('--delay', (-(adelanto || 0) * dur).toFixed(2) + 's');
        b.style.setProperty('--drift', azar(-50, 50).toFixed(0) + 'px');
        b.style.setProperty('--op', azar(0.7, 0.95).toFixed(2));

        var f = document.createElement('div');
        f.className = 'burbuja-flota';
        f.style.setProperty('--sway', azar(2.2, 4).toFixed(1) + 's');
        f.style.setProperty('--amp', azar(6, 20).toFixed(0) + 'px');
        f.innerHTML = svgBurbuja(t, id);

        b.appendChild(f);
        b.addEventListener('animationend', function (e) {
            if (e.target !== b) return;
            b.remove();
            c.activas--;
        });

        c.capa.appendChild(b);
        c.activas++;
    }

    function iniciarBurbujas() {
        if (iniciado) return;
        iniciado = true;

        document.querySelectorAll(SELECTOR).forEach(function (seccion) {
            var capa = document.createElement('div');
            capa.className = 'burbujas-seccion';
            capa.setAttribute('aria-hidden', 'true');
            seccion.insertBefore(capa, seccion.firstChild);
            var c = { seccion: seccion, capa: capa, activas: 0, turno: Math.round(Math.random()), visible: false, llena: false, alto: 0 };
            medir(c);
            capas.push(c);
        });

        window.addEventListener('resize', function () { capas.forEach(medir); });

        // Solo nacen burbujas en las secciones que están en pantalla.
        // Las que ya iban subiendo siguen su camino aunque hagas scroll.
        var io = new IntersectionObserver(function (entradas) {
            entradas.forEach(function (en) {
                for (var k = 0; k < capas.length; k++) {
                    var c = capas[k];
                    if (c.seccion !== en.target) continue;
                    c.visible = en.isIntersecting;
                    if (c.visible && !c.llena) {
                        // La primera vez que aparece, ya trae burbujas a distintas alturas
                        c.llena = true;
                        medir(c);
                        var n = Math.round(maximo(c) * 0.7);
                        for (var i = 0; i < n; i++) lanzar(c, Math.random() * 0.85);
                    }
                }
            });
        }, { rootMargin: '150px 0px' });
        capas.forEach(function (c) { io.observe(c.seccion); });

        setInterval(function () {
            capas.forEach(function (c) {
                if (c.visible && Math.random() < 0.7) lanzar(c, 0);
            });
        }, esMovil() ? 1100 : 800);
    }

    /* ---------- Destellos dorados ---------- */
    var ESTRELLA = '<svg viewBox="0 0 24 24"><path d="M12 0C12.8 8 16 11.2 24 12C16 12.8 12.8 16 12 24C11.2 16 8 12.8 0 12C8 11.2 11.2 8 12 0Z" fill="#F6E7B5"/><path d="M12 5C12.4 9.5 14.5 11.6 19 12C14.5 12.4 12.4 14.5 12 19C11.6 14.5 9.5 12.4 5 12C9.5 11.6 11.6 9.5 12 5Z" fill="#E3BE62"/></svg>';

    function sembrarBrillos(contenedor, cantidad) {
        if (!contenedor) return;
        for (var i = 0; i < cantidad; i++) {
            var s = document.createElement('span');
            s.className = 'brillo';
            s.setAttribute('aria-hidden', 'true');
            s.style.left = azar(4, 94).toFixed(1) + '%';
            s.style.top = azar(6, 92).toFixed(1) + '%';
            s.style.setProperty('--s', azar(7, 17).toFixed(0) + 'px');
            s.style.setProperty('--d', azar(2.2, 4.2).toFixed(1) + 's');
            s.style.setProperty('--del', azar(0, 4).toFixed(1) + 's');
            s.innerHTML = ESTRELLA;
            contenedor.appendChild(s);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        sembrarBrillos(document.querySelector('.hero-section'), esMovil() ? 14 : 22);
        sembrarBrillos(document.getElementById('welcomeModal'), esMovil() ? 12 : 18);

        // Las burbujas empiezan cuando la persona entra (con o sin música)
        ['enterWithMusic', 'enterWithoutMusic'].forEach(function (idBoton) {
            var btn = document.getElementById(idBoton);
            if (btn) btn.addEventListener('click', iniciarBurbujas);
        });

        // Respaldo: si no hay modal visible, arrancan solas
        setTimeout(function () {
            var modal = document.getElementById('welcomeModal');
            if (!modal || getComputedStyle(modal).display === 'none') iniciarBurbujas();
        }, 1500);
    });
})();
