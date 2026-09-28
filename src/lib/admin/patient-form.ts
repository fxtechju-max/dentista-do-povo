// Campos do cadastro de paciente (PatientDialog).
export type PatientFormValues = {
  name: string;
  phone: string;
  email: string;
  cpf: string;
  birth_date: string;
  address: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_cpf: string;
  gender: string;
  responsible_dentist: string;
};

export const emptyPatientForm: PatientFormValues = {
  name: "",
  phone: "",
  email: "",
  cpf: "",
  birth_date: "",
  address: "",
  guardian_name: "",
  guardian_phone: "",
  guardian_cpf: "",
  gender: "",
  responsible_dentist: "",
};
