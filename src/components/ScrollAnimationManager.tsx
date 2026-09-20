'use client';

import React, { useEffect } from 'react';

export default function ScrollAnimationManager() {
  useEffect(() => {
    // Keep track of observed elements to avoid duplicate binding
    const observedElements = new WeakSet<Element>();

    const handleTypewriter = (target: HTMLElement) => {
      const textToType = target.getAttribute('data-typewriter');
      if (!textToType || target.getAttribute('data-typed') === 'true') return;
      target.setAttribute('data-typed', 'true');

      // Clear existing content and attach ink cursor
      target.textContent = '';
      const cursor = document.createElement('span');
      cursor.className = 'typewriter-ink-cursor';
      cursor.textContent = '|';
      target.appendChild(cursor);

      let charIndex = 0;
      const speed = parseInt(target.getAttribute('data-type-speed') || '28', 10);

      const interval = setInterval(() => {
        if (charIndex < textToType.length) {
          cursor.insertAdjacentText('beforebegin', textToType.charAt(charIndex));
          charIndex++;
        } else {
          clearInterval(interval);
          // Keep cursor blinking for 2.5s then remove cleanly
          setTimeout(() => {
            cursor.remove();
          }, 2500);
        }
      }, speed);
    };

    const handleCountUp = (target: HTMLElement) => {
      const targetCount = target.getAttribute('data-count-to');
      if (!targetCount || target.getAttribute('data-counted') === 'true') return;
      target.setAttribute('data-counted', 'true');

      const num = parseInt(targetCount.replace(/[^0-9]/g, ''), 10);
      const suffix = target.getAttribute('data-count-suffix') || '';
      if (isNaN(num)) return;

      let current = 0;
      const duration = 1400; // ms
      const stepTime = 30;
      const totalSteps = duration / stepTime;
      const step = Math.max(1, Math.ceil(num / totalSteps));

      const timer = setInterval(() => {
        current += step;
        if (current >= num) {
          target.textContent = num.toLocaleString('en-IN') + suffix;
          clearInterval(timer);
        } else {
          target.textContent = current.toLocaleString('en-IN') + suffix;
        }
      }, stepTime);
    };

    const observerCallback: IntersectionObserverCallback = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLElement;
          target.classList.add('is-revealed');

          // Trigger Typewriter if requested
          if (target.hasAttribute('data-typewriter')) {
            handleTypewriter(target);
          }

          // Trigger Counter if requested
          if (target.hasAttribute('data-count-to')) {
            handleCountUp(target);
          }

          observer.unobserve(target);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.1,
      rootMargin: '0px 0px -20px 0px',
    });

    const bindElements = () => {
      const elementsToAnimate = document.querySelectorAll(
        '.reveal-on-scroll, [data-typewriter], [data-count-to]'
      );
      elementsToAnimate.forEach((el) => {
        if (!observedElements.has(el)) {
          observedElements.add(el);
          observer.observe(el);
        }
      });
    };

    // Bind after paint so IntersectionObserver never mutates markup during hydration.
    const startId = window.requestAnimationFrame(() => {
      bindElements();
    });

    // Re-bind on DOM updates (for dynamically loaded components or route updates)
    const mutationObserver = new MutationObserver(() => {
      bindElements();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      window.cancelAnimationFrame(startId);
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return null;
}
