export default function getPercent(num: number): string {
	return `${Math.round(num * 100) / 100}%`;
}
