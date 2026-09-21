<script setup>
import { computed } from "vue";
import { useData, withBase } from "vitepress";
import { copy } from "./copy";

const { lang } = useData();
const text = computed(() => copy[lang.value] || copy.en);
const downloadUrl = "https://sourceforge.net/projects/remoteusb/files/latest/download";
</script>

<template>
  <div class="landing">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow"><span></span> USB/IP FOR WINDOWS</p>
        <h1 id="hero-title">{{ text.title }}<br /><span>{{ text.accent }}</span></h1>
        <p class="hero-description">{{ text.description }}</p>
        <div class="actions">
          <a class="button primary" :href="downloadUrl">{{ text.download }} <span aria-hidden="true">↗</span></a>
          <a class="button secondary" :href="withBase(text.guide)">{{ text.start }} <span aria-hidden="true">→</span></a>
        </div>
        <p class="compatibility">Windows 11 · x64 <span> / </span> {{ text.free }}</p>
      </div>
      <div class="connection-art" aria-hidden="true">
        <div class="orbit orbit-one"></div><div class="orbit orbit-two"></div>
        <div class="device-node node-usb">USB</div>
        <div class="brand-node"><img :src="withBase('/icon.png')" alt="" width="100" height="100" /></div>
        <div class="device-node node-pc">PC</div>
        <span class="connection-label">CONNECTED, SIMPLY.</span>
      </div>
    </section>

    <section class="product" aria-labelledby="product-title">
      <div class="section-heading"><div><p class="eyebrow">YOUR DEVICES. ONE PLACE.</p><h2 id="product-title">{{ text.preview }}</h2></div><p>{{ text.previewDescription }}</p></div>
      <figure class="product-frame">
        <div class="window-bar" aria-hidden="true"><span class="window-dots">● ● ●</span><span>RemoteUSB</span><span>USB / IP</span></div>
        <img :src="withBase(`/screenshots/devices-${text.screenshot}.png`)" :alt="text.imageAlt" width="1400" height="952" fetchpriority="high" />
        <figcaption>{{ text.caption }}</figcaption>
      </figure>
    </section>

    <section class="features" aria-labelledby="features-title">
      <p class="eyebrow">BUILT FOR YOUR WORKFLOW</p><h2 id="features-title">{{ text.featuresTitle }}</h2>
      <div class="feature-grid"><article v-for="(feature, index) in text.features" :key="feature[0]"><span class="feature-number">0{{ index + 1 }}</span><h3>{{ feature[0] }}</h3><p>{{ feature[1] }}</p></article></div>
    </section>

    <section class="setup" aria-labelledby="setup-title">
      <div><p class="eyebrow">GET CONNECTED</p><h2 id="setup-title">{{ text.setupTitle }}</h2><a class="text-link" :href="withBase(text.guide)">{{ text.start }} <span aria-hidden="true">→</span></a></div>
      <ol><li v-for="step in text.steps" :key="step[0]"><h3>{{ step[0] }}</h3><p>{{ step[1] }}</p></li></ol>
    </section>

    <section class="download-panel" aria-labelledby="download-title">
      <p class="eyebrow">FREE & OPEN SOURCE</p><h2 id="download-title">{{ text.cta }}</h2><p>{{ text.ctaDescription }}</p>
      <a class="button primary" :href="downloadUrl">{{ text.download }} <span aria-hidden="true">↗</span></a>
      <p class="release-note">{{ text.note }}</p>
      <a class="text-link" href="https://github.com/umaxiaotian/RemoteUSB">{{ text.source }} <span aria-hidden="true">↗</span></a>
    </section>
  </div>
</template>
