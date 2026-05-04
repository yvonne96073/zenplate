// Mifflin-St Jeor BMR formula
export function calcNutritionGoals({ height, weight, age, gender, activity, goal }) {
  const h = Number(height), w = Number(weight), a = Number(age)

  const bmr = gender === 'male'
    ? 10 * w + 6.25 * h - 5 * a + 5
    : 10 * w + 6.25 * h - 5 * a - 161

  const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 }
  const tdee = bmr * (multipliers[activity] || 1.375)

  let calories = tdee
  if (goal === 'lose')    calories = tdee - 500
  if (goal === 'gain')    calories = tdee + 250

  let protein = w * 1.6
  if (goal === 'gain')    protein = w * 2.0
  if (goal === 'lose')    protein = w * 1.8

  const bmi = (w / Math.pow(h / 100, 2)).toFixed(1)
  const bmiLabel =
    bmi < 18.5 ? 'Underweight' :
    bmi < 25   ? 'Normal' :
    bmi < 30   ? 'Overweight' : 'Obese'

  return {
    calories: Math.round(calories / 50) * 50,   // round to nearest 50
    protein:  Math.round(protein / 5) * 5,       // round to nearest 5
    bmi, bmiLabel,
    tdee: Math.round(tdee),
  }
}
