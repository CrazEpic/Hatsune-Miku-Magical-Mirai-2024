export function random_spherical_cartesian_coordinate(radius: number): { x: number; y: number; z: number } {
	return spherical_to_cartesian(radius, Math.acos(getRandomFloat(-1, 1)), getRandomFloat(0, 2 * Math.PI))
}

export function spherical_to_cartesian(radius: number, polar: number, azimuthal: number) {
	return {
		x: radius * Math.sin(polar) * Math.cos(azimuthal),
		y: radius * Math.cos(polar),
		z: radius * Math.sin(polar) * Math.sin(azimuthal),
	}
}

function getRandomFloat(min: number, max: number) {
	return Math.random() * (max - min) + min
}
