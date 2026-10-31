import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer('swangle');
Config.setConcurrency(2);

// В этом контейнере уже установлен Chromium — не качаем свой.
if (require('fs').existsSync('/opt/pw-browsers/chromium')) {
  Config.setBrowserExecutable('/opt/pw-browsers/chromium');
}
Config.setChromiumDisableWebSecurity(true);
