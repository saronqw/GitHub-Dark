module.exports = function(grunt) {
  "use strict";

  let config;
  const defaults = require("./defaults.json");
  const pkg = require("./package.json");
  defaults.webkit = false;
  grunt.file.defaultEncoding = "utf8";

  try {
    config = Object.assign({}, defaults, grunt.file.readJSON("build.json"));
  } catch (err) {
    console.info("build.json not found - using defaults");
    config = defaults;
  }

  function getTheme(name) {
    // fallback to twilight theme if name is undefined
    return (name || "twilight").toLowerCase().replace(/\s+/g, "-");
  }

  function loadTheme(name, folder) {
    let data;
    const theme = getTheme(name);
    if (grunt.file.exists(`themes/${folder}${theme}.min.css`)) {
      data = `<%= grunt.file.read("themes/${folder}${theme}.min.css") %>`;
    } else {
      // fallback to twilight if file doesn't exist
      data = `<%= grunt.file.read("themes/${folder}twilight.min.css") %>`;
    }
    return data;
  }

  // modified from http://stackoverflow.com/a/5624139/145346
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ].join(", ") : "";
  }

  // ** set up build options **
  config.sourceFile = "github-dark.css";

  // get themes
  config.themeMain = loadTheme(config.theme, "github/");
  config.themeCM = loadTheme(config.themeCM, "codemirror/");
  config.themeJP = loadTheme(config.themeJP, "jupyter/");

  // build file name
  config.buildFile = `github-dark-${getTheme(config.theme)}-` +
    `${config.color.replace(/[^\d\w]/g, "")}.build.min.css`;

  // background options
  config.image = /^url/.test(config.image) ?
    config.image :
    `url("${config.image}")`;

  config.bgOptions = config.tiled ? `
    background-repeat: repeat !important;
    background-size: auto !important;
    background-position: left top !important;
    ` :
    // fit background
    `
    background-repeat: no-repeat !important;
    background-size: cover !important;
    background-position: center top !important;
    `;

  config.bgAttachment = config.attach.toLowerCase() === "scroll" ?
    "scroll" :
    "fixed";

  config.codeWrapCss = config.codeWrap ? `
      /* GitHub: Enable wrapping of long code lines */
      body:not(.nowrap) .blob-code-inner,
      body:not(.nowrap) .markdown-body pre > code,
      body:not(.nowrap) .markdown-body .highlight > pre {
        white-space: pre-wrap !important;
        word-break: break-all !important;
        overflow-wrap: break-word !important;
        display: block !important;
      }
      body:not(.nowrap) td.blob-code-inner {
        display: table-cell !important;
      }
    ` : "";

  // get @-moz prefix
  const file = grunt.file.read("github-dark.css")
    .match(/(@-moz-document regexp\((.*)+\) \{(\n|\r)+)/);
  config.prefix = file && file.length ? file[1].replace(/^\s+|\s+$/g, "") : "";

  // custom build
  config.replacements = [{
    pattern: /@-moz-document regexp\((.*)\) \{(\n|\r)+/,
    replacement: ""
  }, {
    pattern: /\/\*\[\[bg-choice\]\]\*\/ url\(.*\)/,
    replacement: config.image
  }, {
    pattern: "/*[[bg-options]]*/",
    replacement: config.bgOptions
  }, {
    pattern: "/*[[bg-attachment]]*/ fixed",
    replacement: config.bgAttachment
  }, {
    pattern: /\/\*\[\[base-color\]\]\*\/ #\w{3,6}/g,
    replacement: config.color
  }, {
    pattern: /\/\*\[\[base-color-rgb\]\]\*\//g,
    replacement: hexToRgb(config.color)
  }, {
    pattern: "/*[[font-choice]]*/",
    replacement: config.font
  }, {
    pattern: "/*[[font-size-choice]]*/",
    replacement: config.fontSize
  }, {
    pattern: "/*[[code-wrap]]*/",
    replacement: config.codeWrapCss
  }, {
    pattern: /\/\*\[\[tab-size\]\]\*\/ \d+/g,
    replacement: config.tab
  }, {
    // remove default syntax themes AND closing bracket
    pattern: /\s+\/\* grunt build - remove start[\s\S]+grunt build - remove end \*\/$/m,
    replacement: ""
  }, {
    // add selected theme
    pattern: "/*[[syntax-theme]]*/",
    replacement: config.themeMain
  }, {
    // add Codemirror theme
    pattern: "/*[[syntax-codemirror]]*/",
    replacement: config.themeCM
  }, {
    // add selected theme
    pattern: "/*[[syntax-jupyter]]*/",
    replacement: config.themeJP
  }];

  // userstyles.org - remove defaults & leave placeholders
  config.replacements_user = [{
    pattern: /@-moz-document regexp\((.*)\) \{(\n|\r)+/,
    replacement: ""
  }, {
    pattern: /\/\*\[\[bg-choice\]\]\*\/ url\(.*\)/,
    replacement: "/*[[bg-choice]]*/"
  }, {
    pattern: "/*[[bg-attachment]]*/ fixed",
    replacement: "/*[[bg-attachment]]*/"
  }, {
    pattern: /\/\*\[\[base-color\]\]\*\/ #\w{3,6}/g,
    replacement: "/*[[base-color]]*/"
  }, {
    pattern: /\/\*\[\[tab-size\]\]\*\/ \d+/g,
    replacement: "/*[[tab-size]]*/"
  }, {
    // remove default syntax theme AND closing bracket
    pattern: /\s+\/\* grunt build - remove start[\s\S]+grunt build - remove end \*\/$/m,
    replacement: ""
  }];

  grunt.initConfig({
    pkg, config,
    "string-replace": {
      inline: {
        files: {"<%= config.buildFile %>": "<%= config.sourceFile %>"},
        options: {replacements: "<%= config.replacements %>"}
      }
    },
    exec: {
      usercss: "node tools/usercss.js",
    },
    wrap: {
      mozrule: {
        files: {"<%= config.buildFile %>": "<%= config.buildFile %>"},
        options: {
          wrapper: ["<%= config.prefix %>", ""]
        }
      }
    }
  });

  grunt.loadNpmTasks("grunt-string-replace");
  grunt.loadNpmTasks("grunt-wrap");
  grunt.loadNpmTasks("grunt-exec");

  // build custom GitHub-Dark style using build.json settings
  grunt.registerTask("default", "Building custom style", () => {
    config.buildFile = config.buildFile.replace(".min.css", ".css");
    grunt.task.run(["string-replace:inline"]);
    if (!(config.chrome || config.webkit)) {
      grunt.task.run(["wrap"]);
    }
  });

  // build usercss
  grunt.registerTask("usercss", "building usercss file", () => {
    config.buildFile = "github-dark-userstyle.build.css";
    config.replacements = config.replacements_user;
    grunt.task.run([
      "string-replace:inline",
      "wrap",
      "exec:usercss"
    ]);
  });
};
