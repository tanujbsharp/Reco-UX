(function () {
  function getFieldRow(fieldName) {
    const input = document.getElementById(`id_${fieldName}`);
    if (!input) return null;

    return (
      input.closest(".form-row") ||
      input.closest(".fieldBox") ||
      input.closest(".form-group") ||
      input.parentElement
    );
  }

  function setFieldVisibility(fieldName, visible) {
    const row = getFieldRow(fieldName);
    const input = document.getElementById(`id_${fieldName}`);

    if (row) {
      row.style.display = visible ? "" : "none";
    }

    if (input) {
      input.disabled = !visible;
    }
  }

  function syncModerationRuleForm() {
    const targetTypeInput = document.getElementById("id_target_type");
    if (!targetTypeInput) return;

    const targetType = targetTypeInput.value;
    const isBoost = targetType === "boost";
    const isPush = targetType === "push";
    const isPromoteIfClose = targetType === "promote_if_close";

    setFieldVisibility("boost_strength", isBoost);
    setFieldVisibility("min_fit_threshold", isBoost);
    setFieldVisibility("target_rank", isPush);
    setFieldVisibility("max_rank", isPromoteIfClose);
    setFieldVisibility("max_gap_percent", isPromoteIfClose);
  }

  document.addEventListener("DOMContentLoaded", function () {
    const targetTypeInput = document.getElementById("id_target_type");
    if (!targetTypeInput) return;

    syncModerationRuleForm();
    targetTypeInput.addEventListener("change", syncModerationRuleForm);
  });
})();
