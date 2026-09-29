import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { initSupabaseClients } from '../src/services/supabase.js';

describe('Supabase Client Service', () => {
  test('throws error when SUPABASE_URL is missing', () => {
    assert.throws(
      () => initSupabaseClients({ SUPABASE_SERVICE_ROLE_KEY: 'test_key' }),
      { message: 'Missing SUPABASE_URL environment variable.' }
    );
  });

  test('throws error when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
    assert.throws(
      () => initSupabaseClients({ SUPABASE_URL: 'https://example.supabase.co' }),
      { message: 'Missing SUPABASE_SERVICE_ROLE_KEY environment variable.' }
    );
  });

  test('initializes supabase and supabaseAnon clients correctly', () => {
    const mockEnv = {
      SUPABASE_URL: 'https://obfnydntordmevdrwqgw.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'dummy_service_role_key',
      SUPABASE_ANON_KEY: 'dummy_anon_key'
    };

    const clients = initSupabaseClients(mockEnv);
    assert.ok(clients.supabase, 'supabase client should be created');
    assert.ok(clients.supabaseAnon, 'supabaseAnon client should be created');
  });

  test('initializes supabase with null supabaseAnon when SUPABASE_ANON_KEY is omitted', () => {
    const mockEnv = {
      SUPABASE_URL: 'https://obfnydntordmevdrwqgw.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'dummy_service_role_key'
    };

    const clients = initSupabaseClients(mockEnv);
    assert.ok(clients.supabase, 'supabase client should be created');
    assert.equal(clients.supabaseAnon, null, 'supabaseAnon client should be null when key omitted');
  });
});
