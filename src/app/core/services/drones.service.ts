import { Injectable } from '@angular/core';
import { supabase } from './supabase-client';
import { Dron } from '../models/dron.model';

@Injectable({ providedIn: 'root' })
export class DronesService {
  async listar(): Promise<Dron[]> {
    const { data, error } = await supabase
      .from('drones')
      .select('*')
      .order('codigo', { ascending: true });

    if (error) throw error;
    return (data ?? []) as Dron[];
  }
}