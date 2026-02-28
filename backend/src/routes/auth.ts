import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest, generateToken } from '../middleware/auth.js';
import { supabaseAdmin } from '../db/client.js';
import bcryptjs from 'bcryptjs';

const router = Router();

// Register user
router.post('/register', async (req: AuthRequest, res) => {
  try {
    const { email, password, full_name, phone } = req.body;

    // Validate input
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcryptjs.hash(password, 10);

    // Create user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: uuidv4(),
          email,
          password_hash: passwordHash,
          full_name,
          phone,
          role: 'driver',
          is_verified: false,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    const token = generateToken(user.id, user.email, user.role);

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
router.post('/login', async (req: AuthRequest, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Get user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await bcryptjs.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.email, user.role);

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', req.user?.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { full_name, phone, avatar_url, preferences } = req.body;

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (full_name) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (preferences) updates.preferences = preferences;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', req.user?.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's devices
router.get('/devices', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { data: devices, error } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('user_id', req.user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch devices' });
    }

    return res.json({
      success: true,
      data: devices,
    });
  } catch (error) {
    console.error('Error getting devices:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Register a new device
router.post('/devices', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { device_id, device_name, device_type, os, os_version, app_version } = req.body;

    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }

    const { data: device, error } = await supabaseAdmin
      .from('devices')
      .insert([
        {
          id: uuidv4(),
          user_id: req.user?.id,
          device_id,
          device_name,
          device_type,
          os,
          os_version,
          app_version,
          is_active: true,
          last_ping: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to register device' });
    }

    return res.status(201).json({
      success: true,
      data: device,
    });
  } catch (error) {
    console.error('Error registering device:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
