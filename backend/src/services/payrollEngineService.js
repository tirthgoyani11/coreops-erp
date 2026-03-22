function round2(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function calculatePayslipPreview(employee, attendanceSummary = {}, ruleConfig = {}) {
  const workingDays = Number(attendanceSummary.workingDays || 30);
  const presentDays = Number(attendanceSummary.presentDays || workingDays);
  const attendanceFactor = workingDays > 0 ? presentDays / workingDays : 1;

  const basic = round2(Number(employee.basicSalary || 0) * attendanceFactor);

  const hraPct = Number(ruleConfig.hraPct ?? 0.2);
  const specialAllowancePct = Number(ruleConfig.specialAllowancePct ?? 0.1);
  const pfPct = Number(ruleConfig.pfPct ?? 0.12);
  const professionalTax = Number(ruleConfig.professionalTax ?? 200);

  const hra = round2(basic * hraPct);
  const specialAllowance = round2(basic * specialAllowancePct);
  const grossPay = round2(basic + hra + specialAllowance);

  const pf = round2(basic * pfPct);
  const totalDeductions = round2(pf + professionalTax);
  const netPay = round2(grossPay - totalDeductions);

  return {
    earnings: [
      { key: 'basic', label: 'Basic Pay', amount: basic },
      { key: 'hra', label: 'HRA', amount: hra },
      { key: 'specialAllowance', label: 'Special Allowance', amount: specialAllowance }
    ],
    deductions: [
      { key: 'pf', label: 'Provident Fund', amount: pf },
      { key: 'professionalTax', label: 'Professional Tax', amount: round2(professionalTax) }
    ],
    grossPay,
    totalDeductions,
    netPay,
  };
}

module.exports = {
  calculatePayslipPreview,
};
