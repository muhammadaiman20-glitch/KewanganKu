/**
 * Debt payoff and extra payment calculation engine.
 * Computes exact months shaved off, interest savings, and side-by-side schedules
 * along with visual graph trajectory points.
 */

export interface TrajectoryPoint {
  month: number;
  monthLabel: string;
  originalBalance: number;
  newBalance: number;
}

export interface PayoffCalculation {
  originalMonths: number;
  newMonths: number;
  monthsSaved: number;
  yearsSaved: number;
  extraMonthsPart: number;
  originalTotalInterest: number;
  newTotalInterest: number;
  interestSaved: number;
  originalTotalPaid: number;
  newTotalPaid: number;
  originalPayoffDate: string;
  newPayoffDate: string;
  trajectory: TrajectoryPoint[];
}

export function calculateDebtPayoff({
  balance,
  annualInterestRate,
  monthlyPayment,
  extraMonthly,
  lumpSum = 0,
}: {
  balance: number;
  annualInterestRate: number;
  monthlyPayment: number;
  extraMonthly: number;
  lumpSum?: number;
}): PayoffCalculation {
  const adjustedBalance = Math.max(0, balance - lumpSum);
  const monthlyRate = annualInterestRate > 0 ? (annualInterestRate / 100) / 12 : 0;
  const maxMonths = 600; // 50 years max guard

  // 1. Simulate base/original schedule & record month-by-month balance
  let bOrig = balance;
  let origMonths = 0;
  let origInterest = 0;
  const origBalances: number[] = [balance];

  if (monthlyRate === 0) {
    origMonths = monthlyPayment > 0 ? Math.ceil(balance / monthlyPayment) : 0;
    origInterest = 0;
    for (let m = 1; m <= origMonths; m++) {
      origBalances.push(Math.max(0, balance - m * monthlyPayment));
    }
  } else {
    while (bOrig > 0.01 && origMonths < maxMonths) {
      origMonths++;
      const intMonth = bOrig * monthlyRate;
      origInterest += intMonth;
      const principalPaid = monthlyPayment - intMonth;
      if (principalPaid <= 0) {
        origMonths = 999;
        break;
      }
      bOrig = Math.max(0, bOrig - principalPaid);
      origBalances.push(bOrig);
    }
  }

  // 2. Simulate accelerated schedule & record month-by-month balance
  const newMonthly = monthlyPayment + extraMonthly;
  let bNew = adjustedBalance;
  let newMonths = 0;
  let newInterest = 0;
  const newBalances: number[] = [adjustedBalance];

  if (monthlyRate === 0) {
    newMonths = newMonthly > 0 ? Math.ceil(adjustedBalance / newMonthly) : 0;
    newInterest = 0;
    for (let m = 1; m <= newMonths; m++) {
      newBalances.push(Math.max(0, adjustedBalance - m * newMonthly));
    }
  } else {
    while (bNew > 0.01 && newMonths < maxMonths) {
      newMonths++;
      const intMonth = bNew * monthlyRate;
      newInterest += intMonth;
      const principalPaid = newMonthly - intMonth;
      if (principalPaid <= 0) {
        newMonths = 999;
        break;
      }
      bNew = Math.max(0, bNew - principalPaid);
      newBalances.push(bNew);
    }
  }

  const monthsSaved = Math.max(0, origMonths - newMonths);
  const yearsSaved = Math.floor(monthsSaved / 12);
  const extraMonthsPart = monthsSaved % 12;
  const interestSaved = Math.max(0, origInterest - newInterest);

  const originalTotalPaid = balance + origInterest;
  const newTotalPaid = balance + newInterest;

  const now = new Date();
  const origDate = new Date(now.getFullYear(), now.getMonth() + origMonths, 1);
  const newDate = new Date(now.getFullYear(), now.getMonth() + newMonths, 1);

  const formatMonthYear = (d: Date) =>
    new Intl.DateTimeFormat('ms-MY', { month: 'short', year: 'numeric' }).format(d);

  // 3. Generate trajectory graph sampling points
  const totalDuration = Math.max(origMonths, newMonths, 1);
  const step = Math.max(1, Math.ceil(totalDuration / 12)); // ~12-14 data points
  const trajectory: TrajectoryPoint[] = [];

  for (let m = 0; m <= totalDuration; m += step) {
    const oBal = m < origBalances.length ? origBalances[m] : 0;
    const nBal = m < newBalances.length ? newBalances[m] : 0;
    const pointDate = new Date(now.getFullYear(), now.getMonth() + m, 1);

    trajectory.push({
      month: m,
      monthLabel: m === 0 ? 'Kini' : `Bln ${m}`,
      originalBalance: Math.round(oBal),
      newBalance: Math.round(nBal),
    });
  }

  // Ensure end point is included
  if (trajectory[trajectory.length - 1].month !== totalDuration) {
    trajectory.push({
      month: totalDuration,
      monthLabel: `Bln ${totalDuration}`,
      originalBalance: 0,
      newBalance: 0,
    });
  }

  return {
    originalMonths: origMonths,
    newMonths,
    monthsSaved,
    yearsSaved,
    extraMonthsPart,
    originalTotalInterest: origInterest,
    newTotalInterest: newInterest,
    interestSaved,
    originalTotalPaid,
    newTotalPaid,
    originalPayoffDate: formatMonthYear(origDate),
    newPayoffDate: formatMonthYear(newDate),
    trajectory,
  };
}
