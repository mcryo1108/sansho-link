/* global Services, Zotero */
var SanshoLinkBootstrap;

function install() {}

async function startup({ id, rootURI }) {
  // Migrate the manual-only 1.0.2 setting once; preserve later user choices.
  try {
    const { AddonManager } = ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");
    const addon = await AddonManager.getAddonByID(id);
    const pref = "extensions.sansho-link.httpsUpdatesConfigured";
    if (addon && !Services.prefs.getBoolPref(pref, false)) {
      addon.applyBackgroundUpdates = AddonManager.AUTOUPDATE_DEFAULT;
      Services.prefs.setBoolPref(pref, true);
    }
  } catch (error) {
    Zotero.logError(error);
  }
  Services.scriptloader.loadSubScript(rootURI + "content/reference-linker.js");
  SanshoLinkBootstrap = globalThis.SanshoLink;
  await SanshoLinkBootstrap.startup({ pluginID: id, rootURI, Zotero });
}

async function shutdown(_data, reason) {
  if (reason === APP_SHUTDOWN) return;
  await SanshoLinkBootstrap?.shutdown();
  SanshoLinkBootstrap = undefined;
  delete globalThis.SanshoLink;
}

function uninstall() {}
