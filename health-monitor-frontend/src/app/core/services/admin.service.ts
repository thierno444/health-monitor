import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminStats {
  utilisateurs: {
    total: number;
    patients: number;
    medecins: number;
    admins: number;
    archives: number;
  };
  dispositifs: {
    assignes: number;
    disponibles: number;
  };
}

export interface User {
  _id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  role: 'patient' | 'medecin' | 'admin';
  idDispositif?: string;
  photoProfil?: string;
  estActif: boolean;
  estArchive?: boolean;
  createdAt: Date;
}

export interface Device {
  _id: string;
  idDispositif: string;
  nom: string;
  statut: 'disponible' | 'assigne' | 'inactif';
  patientId?: {
    _id: string;
    prenom: string;
    nom: string;
    email: string;
    photoProfil?: string; 
  };
  derniereConnexion?: Date;
  versionFirmware?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Log {
  _id: string;
  type: 'user_create' | 'user_update' | 'user_delete' | 'device_create' | 'device_assign' | 'device_delete' | 'import_csv' | 'sync_devices' | 'login' | 'logout' | 'other';
  adminId: {
    _id: string;
    prenom: string;
    nom: string;
    email: string;
    photoProfil?: string;
  };
  adminEmail: string;
  targetType?: 'user' | 'device' | 'system' | null;
  targetId?: string;
  targetName?: string;
  action: string;
  details?: any;
  ipAddress?: string;
  status: 'success' | 'error';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Assignment {
  _id: string;
  medecinId: {
    _id: string;
    prenom: string;
    nom: string;
    email: string;
    photoProfil?: string;
  };
  patientId: {
    _id: string;
    prenom: string;
    nom: string;
    email: string;
    photoProfil?: string;
    idDispositif?: string;
  };
  actif: boolean;
  priorite: 'basse' | 'moyenne' | 'haute' | 'urgente';
  dateAssignation: Date;
  dateDesassignation?: Date;
  notesAssignation?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignmentStats {
  total: number;
  actives: number;
  inactives: number;
  parPriorite: {
    urgente: number;
    haute: number;
    moyenne: number;
    basse: number;
  };
}

export interface LogStats {
  totalLogs: number;
  logsByType: { _id: string; count: number }[];
  recentErrors: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Statistiques globales
  getStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/stats`);
  }

  // Données graphiques
  getCharts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/charts`);
  }

  // Liste tous les utilisateurs
  getUsers(role?: string, search?: string, includeArchived: boolean = false): Observable<any> {
    let params: any = {};
    if (role) params.role = role;
    if (search) params.search = search;
    if (includeArchived) params.includeArchived = 'true';
    
    return this.http.get(`${this.apiUrl}/admin/users`, { params });
  }

  // Créer utilisateur
  createUser(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/users`, userData);
  }

  // Modifier utilisateur
  updateUser(userId: string, userData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/users/${userId}`, userData);
  }

  // Supprimer utilisateur
  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/users/${userId}`);
  }

  // Suppression multiple
  bulkDeleteUsers(userIds: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/users/bulk-delete`, { userIds });
  }

  // Import CSV
  importCSV(csvData: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/users/import-csv`, { csvData });
  }

  // Gestion dispositifs
  getDevices(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/devices`);
  }

  createDevice(deviceData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/devices`, deviceData);
  }

  assignDevice(deviceId: string, patientId: string | null): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/devices/${deviceId}/assign`, { patientId });
  }

  deleteDevice(deviceId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/devices/${deviceId}`);
  }

  syncDevices(): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/devices/sync`, {});
  }

  // Gestion logs
  getLogs(type?: string, adminId?: string, startDate?: string, endDate?: string, limit?: number): Observable<any> {
    let params: any = {};
    if (type) params.type = type;
    if (adminId) params.adminId = adminId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (limit) params.limit = limit.toString();

    return this.http.get(`${this.apiUrl}/admin/logs`, { params });
  }

  getLogStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/logs/stats`);
  }

  clearOldLogs(days: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/logs/clear?days=${days}`);
  }

  // Récupérer toutes les assignations
  getAllAssignments(actif?: boolean, medecinId?: string, patientId?: string): Observable<any> {
    let params: any = {};
    if (actif !== undefined) params.actif = actif.toString();
    if (medecinId) params.medecinId = medecinId;
    if (patientId) params.patientId = patientId;

    return this.http.get(`${this.apiUrl}/admin/assignations`, { params });
  }

  // Exporter les assignations en CSV
  exportAssignmentsCSV(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/admin/assignations/export-csv`, { 
      responseType: 'blob' 
    });
  }

  // Assigner un patient à un médecin
  assignPatientToDoctor(medecinId: string, patientId: string, priorite: string, notes: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/assignments`, {
      medecinId,
      patientId,
      priorite,
      notesAssignation: notes
    });
  }

  // Désassigner un patient
  unassignPatient(patientId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/assignments/patient/${patientId}`);
  }

  // Désassigner une assignation spécifique
  unassignAssignment(assignmentId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/assignments/${assignmentId}`);
  }

  // Récupérer les assignations d'un patient
  getPatientAssignments(patientId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/assignments/patient/${patientId}`);
  }

  // Récupérer les assignations
  getAssignments(medecinId?: string, patientId?: string): Observable<any> {
    let params: any = {};
    if (medecinId) params.medecinId = medecinId;
    if (patientId) params.patientId = patientId;

    return this.http.get(`${this.apiUrl}/assignments`, { params });
  }
}