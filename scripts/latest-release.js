(() => {
    const releasePage = "https://github.com/jamesstringer90/appsandbox/releases/latest";
    const endpoint = "https://api.github.com/repos/jamesstringer90/appsandbox/releases/latest";
    const platforms = ["win-x64", "win-arm64", "mac-arm64"];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    fetch(endpoint, { signal: controller.signal, cache: "no-store" })
        .then(response => {
            if (!response.ok) throw new Error("Release lookup unavailable");
            return response.json();
        })
        .then(release => {
            if (release.draft || release.prerelease || typeof release.tag_name !== "string" ||
                !/^v?\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(release.tag_name) ||
                !Array.isArray(release.assets)) throw new Error("Invalid release");
            const version = release.tag_name.replace(/^v/, "");
            const downloads = platforms.map(platform => {
                const name = "AppSandbox-" + version + "-" + platform + ".zip";
                const assets = release.assets.filter(asset => asset.name === name && asset.state === "uploaded");
                if (assets.length !== 1) throw new Error("Release package unavailable");
                const expected = "https://github.com/jamesstringer90/appsandbox/releases/download/" +
                    encodeURIComponent(release.tag_name) + "/" + name;
                if (assets[0].browser_download_url !== expected) throw new Error("Invalid package URL");
                return { platform, url: expected };
            });
            downloads.forEach(download => {
                document.querySelectorAll('[data-download="' + download.platform + '"]').forEach(link => {
                    link.href = download.url;
                });
            });
            const label = document.querySelector("[data-release-label]");
            if (label) label.textContent = release.tag_name + " is available";
        })
        .catch(() => {
            document.querySelectorAll("[data-download]").forEach(link => {
                link.href = releasePage;
            });
        })
        .finally(() => clearTimeout(timeout));
})();
