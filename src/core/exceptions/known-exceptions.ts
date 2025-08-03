// src/common/exceptions/known-exceptions.ts
import { BadRequestException, NotFoundException, UnauthorizedException } from "@nestjs/common";

export const KnownExceptions = {
	invalidCredentials: () => new UnauthorizedException("Invalid credentials"),
	unauthorized: () => new UnauthorizedException("Unauthorized"),
	requiredField: (field: string) =>
		new BadRequestException(`${field} is required`),
	requiredDoctorId: () => new BadRequestException("Doctor ID is required"),
	notFoundDoctor: () => new NotFoundException("Doctor not found"),
	notFoundReceptionist: () => new NotFoundException("Receptionist not found"),
	notFoundUser: () => new NotFoundException("User not found"),
};
