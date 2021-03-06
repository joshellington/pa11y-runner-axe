"use strict";

const path = require("path");
const axePath = path.dirname(require.resolve("axe-core"));

const runner = (module.exports = {});

/**
 * The Pa11y versions supported by this runner.
 * @public
 * @type {Array}
 */
runner.supports = "^6.0.0 || ^6.0.0-alpha || ^6.0.0-beta";

/**
 * Scripts which the test runner depends on.
 * @public
 * @type {Array}
 */
runner.scripts = [`${axePath}/axe.min.js`];

/**
 * Run the test runner.
 * @public
 * @param {Object} options - A set of options to run the tests with.
 * @param {Object} pa11y - The Pa11y object, including helper methods.
 * @returns {Promise} Returns a promise which resolves with aXe issues.
 */
runner.run = async (options) => {
  // Configure and run aXe
  const results = await runAxeCore();
  return results;

  /**
   * Run aXe on the current page.
   * @private
   * @returns {Promise} Returns a promise which resolves with aXe issues.
   */
  async function runAxeCore() {
    const result = await window.axe.run(getAxeContext(), getAxeOptions());
    return [].concat(
      ...result.violations.map(processViolation),
      ...result.incomplete.map(processIncomplete),
      ...result.passes.map(processPass)
    );
  }

  /**
   * Get the proper context to pass to aXe, according to the specified Pa11y options. It can be an
   * HTML element or a CSS selector, ready to be used in axe.run().
   * @private
   * @returns {Node | string} Returns a context element
   */
  function getAxeContext() {
    return options.rootElement || window.document;
  }

  /**
   * Get the proper options to pass to aXe, according to the specified Pa11y options, ready to be
   * used in axe.run().
   * @private
   * @returns {RunOptions} Returns a configuration object.
   */
  function getAxeOptions() {
    const axeOptions = {};

    if (options.standard) {
      axeOptions.runOnly = pa11yStandardToAxe();
    }
    if (Array.isArray(options.rules)) {
      axeOptions.rules = pa11yRulesToAxe();
    }

    return axeOptions;
  }

  /**
   * Map the Pa11y standard option to the aXe runOnly option.
   * @private
   * @returns {RunOnly} Returns the aXe runOnly value.
   */
  function pa11yStandardToAxe() {
    switch (options.standard) {
      case "Section508":
        return {
          type: "tags",
          values: ["section508", "best-practice"],
        };
      case "WCAG2A":
        return {
          type: "tags",
          values: ["wcag2a", "wcag21a", "best-practice"],
        };
      case "WCAG2AA":
      case "WCAG2AAA":
      default:
        return {
          type: "tags",
          values: ["wcag2a", "wcag21a", "wcag2aa", "wcag21aa", "best-practice"],
        };
    }
  }

  /**
   * Map the Pa11y rules option to the aXe rules option.
   * @returns {Object} Returns the aXe rules value.
   */
  function pa11yRulesToAxe() {
    const axeRules = {};
    options.rules.forEach((rule) => (axeRules[rule] = { enabled: true }));
    return axeRules;
  }

  /**
   * Process an aXe issue with type of "violation".
   * @private
   * @param {Object} issue - An aXe issue to process.
   * @returns {Object} Returns the processed issue.
   */
  function processViolation(issue) {
    issue.type = "error";
    return processIssue(issue);
  }

  /**
   * Process an aXe issue with type of "incomplete".
   * @private
   * @param {Object} issue - An aXe issue to process.
   * @returns {Object} Returns an array of processed issues.
   */
  function processIncomplete(issue) {
    issue.type = "warning";
    return processIssue(issue);
  }

  /**
   * Process an aXe issue with type of "pass".
   * @private
   * @param {Object} issue - An aXe issue to process.
   * @returns {Object} Returns an array of processed issues.
   */
  function processPass(issue) {
    issue.type = "pass";
    return processIssue(issue);
  }

  /**
   * Process an aXe issue.
   * @private
   * @param {Object} axeIssue - An aXe issue to process.
   * @returns {Object[]} Returns an array of processed issues.
   */
  function processIssue(axeIssue) {
    // See https://github.com/dequelabs/axe-core/blob/develop/doc/API.md#results-object for a description
    // of an axe issue

    let elements = [null];
    if (axeIssue.nodes.length) {
      const selectors = axeIssue.nodes.map((node) =>
        selectorToString(node.target)
      );
      elements = selectors.map((selector) =>
        window.document.querySelector(selector)
      );
    }

    return elements.map((element) => ({
      code: axeIssue.id,
      message: `${axeIssue.help} (${axeIssue.helpUrl})`,
      type: axeIssue.type,
      element,
      runnerExtras: {
        description: axeIssue.description,
        impact: axeIssue.impact,
        help: axeIssue.help,
        helpUrl: axeIssue.helpUrl,
      },
    }));
  }

  /**
   * Convert an aXe selector array to a selector string. Copied from
   * https://github.com/dequelabs/axe-cli/blob/develop/lib/utils.js
   * for now, wonder if we can share or move out.
   * @private
   * @param {Array} selectors - The selector parts.
   * @returns {String} Returns the selector string.
   */
  function selectorToString(selectors) {
    return selectors
      .reduce((selectorParts, selector) => selectorParts.concat(selector), [])
      .join(" ");
  }
};
