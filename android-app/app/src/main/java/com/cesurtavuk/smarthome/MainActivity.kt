package com.cesurtavuk.smarthome

import android.Manifest
import android.app.Activity
import android.app.PendingIntent
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.hardware.usb.UsbManager
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.SeekBar
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import com.hoho.android.usbserial.driver.UsbSerialPort
import com.hoho.android.usbserial.driver.UsbSerialProber
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.log10
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt

class MainActivity : Activity() {
    private val apiUrl = "https://smart-home-control.cesurtavuk1905.workers.dev/api/state"
    private val usbPermissionAction = "com.cesurtavuk.smarthome.USB_PERMISSION"
    private val sppUuid: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    private val amber = 0xFFF4BD35.toInt()
    private val background = 0xFF0B1220.toInt()
    private val panel = 0xFF172338.toInt()
    private val white = 0xFFF4F7FB.toInt()
    private val muted = 0xFF9AABC1.toInt()

    private lateinit var root: LinearLayout
    private lateinit var statusText: TextView
    private lateinit var connectionType: Spinner
    private lateinit var deviceSpinner: Spinner
    private lateinit var musicMode: Spinner
    private lateinit var musicStatus: TextView
    private lateinit var audioStartButton: Button
    private lateinit var audioStopButton: Button
    private lateinit var loginButton: Button
    private var token = ""
    private var connected = false
    private var usbPort: UsbSerialPort? = null
    private var usbConnection: android.hardware.usb.UsbDeviceConnection? = null
    private var btSocket: BluetoothSocket? = null
    private var btAdapter: BluetoothAdapter? = null
    private var pairedDevices: List<BluetoothDevice> = emptyList()
    private var readerThread: Thread? = null
    private var receiverRegistered = false
    private var projection: MediaProjection? = null
    private var audioRecord: AudioRecord? = null
    @Volatile private var audioRunning = false
    private var audioThread: Thread? = null
    private var lastSent = intArrayOf(-1, -1)
    private var gauges = arrayOfNulls<GaugeView>(2)
    private var sliders = arrayOfNulls<SeekBar>(2)
    private var previousBass = 0.0
    private var smoothedVolume = 0.0
    private var smoothedBass = 0.0
    private var audioStartedAt = 0L

    private val usbReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action != usbPermissionAction) return
            val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
            if (granted) openUsbDevice() else toast("USB bağlantı izni verilmedi.")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = background
        window.navigationBarColor = background
        val manager = getSystemService(BluetoothManager::class.java)
        btAdapter = manager?.adapter
        val filter = IntentFilter(usbPermissionAction)
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(usbReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            registerReceiver(usbReceiver, filter)
        }
        receiverRegistered = true
        showLogin()
    }

    private fun baseRoot() {
        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(18), dp(18), dp(18))
            setBackgroundColor(this@MainActivity.background)
        }
        setContentView(root)
    }

    private fun showLogin() {
        baseRoot()
        val scroll = ScrollView(this)
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(4), dp(34), dp(4), dp(34))
        }
        val title = text("SMART HOME CONTROL", 27f, amber, true)
        content.addView(title, matchWrap())
        content.addView(text("İki LED kanalı · USB OTG · HC-05 · Sistem sesi", 14f, muted), matchWrap())
        content.addView(space(30))
        val user = EditText(this).apply {
            hint = "Kullanıcı adı"
            setSingleLine(true)
            setText("Smart Home")
            setTextColor(white)
            setHintTextColor(muted)
            setPadding(dp(14), dp(12), dp(14), dp(12))
            setBackgroundColor(panel)
        }
        val pass = EditText(this).apply {
            hint = "CONTROL_TOKEN / şifre"
            inputType = 129
            setSingleLine(true)
            setTextColor(white)
            setHintTextColor(muted)
            setPadding(dp(14), dp(12), dp(14), dp(12))
            setBackgroundColor(panel)
        }
        content.addView(user, matchWrap())
        content.addView(space(12))
        content.addView(pass, matchWrap())
        loginButton = button("GİRİŞ YAP")
        content.addView(space(18))
        content.addView(loginButton, matchWrap())
        content.addView(space(12))
        content.addView(text("Giriş, mevcut Cloudflare Worker üzerinden doğrulanır. Şifre cihazda kalıcı olarak saklanmaz.", 12f, muted), matchWrap())
        loginButton.setOnClickListener {
            val username = user.text.toString().trim()
            val password = pass.text.toString()
            if (username != "Smart Home" || password.isBlank()) {
                toast("Kullanıcı adı veya şifreyi kontrol et.")
                return@setOnClickListener
            }
            loginButton.isEnabled = false
            Thread {
                var ok = false
                var error = "Sunucuya ulaşılamadı."
                try {
                    val conn = URL(apiUrl).openConnection() as HttpURLConnection
                    conn.requestMethod = "GET"
                    conn.connectTimeout = 12000
                    conn.readTimeout = 12000
                    conn.setRequestProperty("Authorization", "Bearer $password")
                    conn.setRequestProperty("Cache-Control", "no-store")
                    val code = conn.responseCode
                    val body = (if (code in 200..299) conn.inputStream else conn.errorStream)
                        ?.bufferedReader()?.use { it.readText() }.orEmpty()
                    ok = code in 200..299 && body.contains("\"ok\":true") && body.contains("\"target\"")
                    if (!ok) error = "Giriş doğrulanamadı. Token veya Worker yanıtını kontrol et."
                    conn.disconnect()
                } catch (_: Exception) { }
                runOnUiThread {
                    loginButton.isEnabled = true
                    if (ok) {
                        token = password
                        showDashboard()
                    } else toast(error)
                }
            }.start()
        }
        scroll.addView(content)
        root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
    }

    private fun showDashboard() {
        baseRoot()
        val scroll = ScrollView(this)
        val page = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        page.addView(text("SMART HOME CONTROL", 22f, amber, true), matchWrap())
        page.addView(text("İki tek renk LED · Arduino Nano", 13f, muted), matchWrap())
        page.addView(space(12))
        statusText = text("Bağlantı yok", 13f, muted)
        page.addView(statusText, matchWrap())

        page.addView(sectionTitle("BAĞLANTI"))
        connectionType = Spinner(this).apply {
            adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, listOf("USB OTG", "HC-05 Bluetooth"))
        }
        page.addView(connectionType, matchWrap())
        deviceSpinner = Spinner(this)
        page.addView(deviceSpinner, matchWrap())
        val refresh = button("AYGITLARI YENİLE")
        val connect = button("BAĞLAN")
        val disconnect = button("BAĞLANTIYI KES")
        page.addView(row(refresh, connect, disconnect))
        refresh.setOnClickListener { refreshDevices() }
        connect.setOnClickListener { connectSelected() }
        disconnect.setOnClickListener { disconnectHardware() }
        connectionType.onItemSelectedListener = object : android.widget.AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: android.widget.AdapterView<*>?, view: View?, position: Int, id: Long) {
                refreshDevices()
            }
            override fun onNothingSelected(parent: android.widget.AdapterView<*>?) {}
        }

        page.addView(sectionTitle("LED KONTROLÜ"))
        for (index in 0..1) {
            val channel = index + 1
            val card = card()
            card.addView(text("💡 LED $channel", 18f, white, true), matchWrap())
            val gauge = GaugeView(this)
            gauges[index] = gauge
            card.addView(gauge, LinearLayout.LayoutParams(-1, dp(145)))
            val seek = SeekBar(this).apply { max = 100; progress = 0; isEnabled = false }
            sliders[index] = seek
            card.addView(seek, matchWrap())
            seek.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(bar: SeekBar?, value: Int, fromUser: Boolean) {
                    gauge.value = value
                }
                override fun onStartTrackingTouch(bar: SeekBar?) {}
                override fun onStopTrackingTouch(bar: SeekBar?) {
                    sendCommand("SET $channel ${bar?.progress ?: 0} 0")
                }
            })
            val on = button("AÇ")
            val half = button("%50")
            val full = button("%100")
            val off = button("KAPAT")
            page.addView(row(on, half, full, off))
            on.setOnClickListener { setLed(channel, 100) }
            half.setOnClickListener { setLed(channel, 50) }
            full.setOnClickListener { setLed(channel, 100) }
            off.setOnClickListener { setLed(channel, 0) }
            page.addView(card)
        }

        page.addView(sectionTitle("🎵 MEDYA SESİNDEN MÜZİK MODU"))
        page.addView(text("Mikrofon girişi açılmaz. Android'in medya oynatma yakalama özelliği kullanılır. Bazı uygulamalar ses yakalamayı engelleyebilir.", 12f, muted), matchWrap())
        musicMode = Spinner(this).apply {
            adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item,
                listOf("Ritim", "Nefes", "Strobe", "Dalga", "Karışık"))
        }
        page.addView(musicMode, matchWrap())
        audioStartButton = button("SİSTEM SESİNİ YAKALA")
        audioStopButton = button("MÜZİK MODUNU DURDUR")
        page.addView(row(audioStartButton, audioStopButton))
        musicStatus = text("Müzik modu kapalı", 13f, muted)
        page.addView(musicStatus, matchWrap())
        audioStartButton.setOnClickListener { requestAudioCapture() }
        audioStopButton.setOnClickListener { stopAudioCapture() }

        page.addView(sectionTitle("SERİ DURUMU"))
        val status = button("ARDUINO DURUMUNU SORGULA")
        page.addView(status, matchWrap())
        status.setOnClickListener { sendCommand("STATUS") }
        page.addView(space(20))
        val logout = button("ÇIKIŞ YAP")
        page.addView(logout, matchWrap())
        logout.setOnClickListener {
            stopAudioCapture()
            disconnectHardware()
            token = ""
            showLogin()
        }
        scroll.addView(page)
        root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        refreshDevices()
        updateConnectionUi()
    }

    private fun refreshDevices() {
        if (!::deviceSpinner.isInitialized) return
        if (connectionType.selectedItemPosition == 0) {
            val usbManager = getSystemService(USB_SERVICE) as UsbManager
            val drivers = UsbSerialProber.getDefaultProber().findAllDrivers(usbManager)
            val labels = if (drivers.isEmpty()) listOf("USB seri aygıtı bulunamadı") else
                drivers.map { "${it.device.productName ?: "USB Seri"} (VID ${it.device.vendorId})" }
            deviceSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, labels)
        } else {
            if (Build.VERSION.SDK_INT >= 31 && checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(arrayOf(Manifest.permission.BLUETOOTH_CONNECT), REQ_BT)
                deviceSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, listOf("Bluetooth izni bekleniyor"))
                return
            }
            try {
                pairedDevices = btAdapter?.bondedDevices?.toList()?.sortedBy { it.name ?: it.address } ?: emptyList()
                val labels = if (pairedDevices.isEmpty()) listOf("Eşleştirilmiş HC-05 bulunamadı") else
                    pairedDevices.map { "${it.name ?: "Bluetooth"} · ${it.address}" }
                deviceSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, labels)
            } catch (_: SecurityException) {
                toast("Bluetooth bağlantı izni gerekli.")
            }
        }
    }

    private fun connectSelected() {
        if (connected) {
            toast("Önce mevcut bağlantıyı kes.")
            return
        }
        if (connectionType.selectedItemPosition == 0) {
            val manager = getSystemService(USB_SERVICE) as UsbManager
            val drivers = UsbSerialProber.getDefaultProber().findAllDrivers(manager)
            if (drivers.isEmpty()) {
                toast("USB OTG üzerinden Arduino Nano'yu bağla.")
                return
            }
            val driver = drivers.getOrNull(deviceSpinner.selectedItemPosition) ?: drivers.first()
            if (manager.hasPermission(driver.device)) openUsb(driver)
            else {
                val intent = PendingIntent.getBroadcast(this, 0, Intent(usbPermissionAction).setPackage(packageName),
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE)
                manager.requestPermission(driver.device, intent)
                toast("USB bağlantı izni bekleniyor.")
            }
        } else {
            if (Build.VERSION.SDK_INT >= 31 && checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(arrayOf(Manifest.permission.BLUETOOTH_CONNECT), REQ_BT)
                return
            }
            val device = pairedDevices.getOrNull(deviceSpinner.selectedItemPosition)
            if (device == null) {
                toast("Önce Android Bluetooth ayarlarından HC-05'i eşleştir.")
                return
            }
            connectBluetooth(device)
        }
    }

    private fun openUsbDevice() {
        val manager = getSystemService(USB_SERVICE) as UsbManager
        val driver = UsbSerialProber.getDefaultProber().findAllDrivers(manager).firstOrNull()
        if (driver == null) {
            toast("USB seri sürücüsü bulunamadı.")
            return
        }
        openUsb(driver)
    }

    private fun openUsb(driver: com.hoho.android.usbserial.driver.UsbSerialDriver) {
        try {
            val manager = getSystemService(USB_SERVICE) as UsbManager
            val connection = manager.openDevice(driver.device) ?: run {
                toast("USB aygıtı açılamadı.")
                return
            }
            val port = driver.ports.first()
            port.open(connection)
            port.setParameters(115200, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE)
            usbConnection = connection
            usbPort = port
            connected = true
            startUsbReader(port)
            updateConnectionUi("USB OTG bağlı · 115200 baud")
            sendCommand("STATUS")
        } catch (e: Exception) {
            toast("USB bağlantı hatası: ${e.message}")
            disconnectHardware()
        }
    }

    private fun startUsbReader(port: UsbSerialPort) {
        readerThread = Thread {
            val buffer = ByteArray(512)
            val pending = StringBuilder()
            while (connected && usbPort === port) {
                try {
                    val count = port.read(buffer, 500)
                    if (count > 0) {
                        pending.append(String(buffer, 0, count, Charsets.UTF_8))
                        while (pending.contains("\n")) {
                            val cut = pending.indexOf("\n")
                            val line = pending.substring(0, cut).trim()
                            pending.delete(0, cut + 1)
                            runOnUiThread { handleSerialLine(line) }
                        }
                    }
                } catch (_: Exception) { break }
            }
        }.apply { name = "usb-serial-reader"; start() }
    }

    private fun connectBluetooth(device: BluetoothDevice) {
        statusText.text = "HC-05 bağlantısı kuruluyor…"
        Thread {
            try {
                val socket = device.createRfcommSocketToServiceRecord(sppUuid)
                btAdapter?.cancelDiscovery()
                socket.connect()
                btSocket = socket
                connected = true
                startBluetoothReader(socket)
                runOnUiThread {
                    updateConnectionUi("HC-05 bağlı · 115200 baud")
                    sendCommand("STATUS")
                }
            } catch (e: Exception) {
                runOnUiThread {
                    connected = false
                    updateConnectionUi("Bluetooth bağlantısı başarısız")
                    toast("HC-05 bağlanamadı: ${e.message}")
                }
            }
        }.start()
    }

    private fun startBluetoothReader(socket: BluetoothSocket) {
        readerThread = Thread {
            try {
                val reader = BufferedReader(InputStreamReader(socket.inputStream))
                while (connected) {
                    val line = reader.readLine() ?: break
                    runOnUiThread { handleSerialLine(line) }
                }
            } catch (_: Exception) { }
        }.apply { name = "hc05-reader"; start() }
    }

    private fun handleSerialLine(line: String) {
        if (line.startsWith("STATE ")) {
            val parts = line.split(Regex("\\s+"))
            if (parts.size >= 3) {
                val channel = parts[1].toIntOrNull() ?: return
                val value = parts[2].toIntOrNull() ?: return
                if (channel in 1..2) {
                    gauges[channel - 1]?.value = value
                    sliders[channel - 1]?.progress = value
                }
            }
        }
    }

    private fun sendCommand(command: String) {
        if (!connected) {
            toast("Önce Arduino bağlantısı kur.")
            return
        }
        Thread {
            try {
                val bytes = (command.trimEnd() + "\n").toByteArray(Charsets.UTF_8)
                val port = usbPort
                val socket = btSocket
                if (port != null) port.write(bytes, 1000)
                else socket?.outputStream?.write(bytes)
            } catch (e: Exception) {
                runOnUiThread { toast("Komut gönderilemedi: ${e.message}") }
            }
        }.start()
    }

    private fun sendMusicLevels(one: Int, two: Int) {
        if (!connected) return
        val safeOne = one.coerceIn(0, 100)
        val safeTwo = two.coerceIn(0, 100)
        if (kotlin.math.abs(safeOne - lastSent[0]) < 3 && kotlin.math.abs(safeTwo - lastSent[1]) < 3 &&
            SystemClock.elapsedRealtime() - audioStartedAt < 180) return
        lastSent = intArrayOf(safeOne, safeTwo)
        audioStartedAt = SystemClock.elapsedRealtime()
        sendCommand("SET 1 $safeOne 0\nSET 2 $safeTwo 0")
        runOnUiThread {
            gauges[0]?.value = safeOne
            gauges[1]?.value = safeTwo
            sliders[0]?.progress = safeOne
            sliders[1]?.progress = safeTwo
            musicStatus.text = "Sistem sesi analiz ediliyor · LED 1: $safeOne% · LED 2: $safeTwo%"
        }
    }

    private fun setLed(channel: Int, value: Int) {
        sendCommand("SET $channel $value 0")
        gauges[channel - 1]?.value = value
        sliders[channel - 1]?.progress = value
    }

    private fun updateConnectionUi(message: String? = null) {
        if (!::statusText.isInitialized) return
        statusText.text = message ?: if (connected) "Arduino bağlı" else "Bağlantı yok"
        for (slider in sliders) slider?.isEnabled = connected
        if (::audioStartButton.isInitialized) audioStartButton.isEnabled = connected && !audioRunning
    }

    private fun disconnectHardware() {
        connected = false
        try { usbPort?.close() } catch (_: Exception) { }
        try { usbConnection?.close() } catch (_: Exception) { }
        try { btSocket?.close() } catch (_: Exception) { }
        usbPort = null
        usbConnection = null
        btSocket = null
        updateConnectionUi("Bağlantı kesildi")
    }

    private fun requestAudioCapture() {
        if (!connected) {
            toast("Önce Arduino'ya USB veya HC-05 ile bağlan.")
            return
        }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), REQ_AUDIO)
            return
        }
        val manager = getSystemService(MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        startActivityForResult(manager.createScreenCaptureIntent(), REQ_PROJECTION)
    }

    @Deprecated("MediaProjection consent is returned through the activity result")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQ_PROJECTION) {
            if (resultCode != RESULT_OK || data == null) {
                toast("Sistem sesi yakalama izni verilmedi.")
                return
            }
            try {
                val manager = getSystemService(MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
                projection = manager.getMediaProjection(resultCode, data)
                beginPlaybackCapture()
            } catch (e: Exception) {
                toast("Ses yakalama başlatılamadı: ${e.message}")
            }
        }
    }

    private fun beginPlaybackCapture() {
        val mediaProjection = projection ?: return
        try {
            val config = android.media.AudioPlaybackCaptureConfiguration.Builder(mediaProjection)
                .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
                .addMatchingUsage(AudioAttributes.USAGE_GAME)
                .addMatchingUsage(AudioAttributes.USAGE_UNKNOWN)
                .build()
            val format = AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .setSampleRate(44100)
                .setChannelMask(AudioFormat.CHANNEL_IN_MONO)
                .build()
            val minBuffer = AudioRecord.getMinBufferSize(44100, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
            val recorder = AudioRecord.Builder()
                .setAudioFormat(format)
                .setBufferSizeInBytes(max(minBuffer, 8192))
                .setAudioPlaybackCaptureConfig(config)
                .build()
            if (recorder.state != AudioRecord.STATE_INITIALIZED) {
                recorder.release()
                toast("Medya sesi yakalama aygıtı başlatılamadı.")
                return
            }
            audioRecord = recorder
            recorder.startRecording()
            audioRunning = true
            lastSent = intArrayOf(-1, -1)
            previousBass = 0.0
            smoothedVolume = 0.0
            smoothedBass = 0.0
            audioStartButton.isEnabled = false
            audioStopButton.isEnabled = true
            musicStatus.text = "Android sistem sesi dinleniyor (mikrofon kullanılmıyor)"
            audioThread = Thread { audioLoop(recorder) }.apply { name = "playback-audio-capture"; start() }
        } catch (e: Exception) {
            toast("Medya sesi alınamadı: ${e.message}")
            stopAudioCapture()
        }
    }

    private fun audioLoop(recorder: AudioRecord) {
        val samples = ShortArray(1024)
        var lastUi = 0L
        var lastBeatTime = 0L
        while (audioRunning) {
            val count = try { recorder.read(samples, 0, samples.size) } catch (_: Exception) { -1 }
            if (count <= 0) continue
            var sum = 0.0
            for (i in 0 until count) {
                val normalized = samples[i] / 32768.0
                sum += normalized * normalized
            }
            val rms = sqrt(sum / count)
            val db = 20.0 * log10(max(rms, 0.000001))
            val volume = ((db + 55.0) / 45.0 * 100.0).coerceIn(0.0, 100.0)
            val bassAmplitude = max(goertzel(samples, count, 70.0), max(goertzel(samples, count, 110.0), goertzel(samples, count, 160.0)))
            val bass = (bassAmplitude * 260.0).coerceIn(0.0, 100.0)
            smoothedVolume += (volume - smoothedVolume) * if (volume > smoothedVolume) 0.48 else 0.16
            smoothedBass += (bass - smoothedBass) * if (bass > smoothedBass) 0.58 else 0.20
            val now = SystemClock.elapsedRealtime()
            val beat = smoothedBass > max(12.0, previousBass * 1.24) && now - lastBeatTime > 180
            if (beat) lastBeatTime = now
            previousBass = previousBass * 0.82 + smoothedBass * 0.18
            val phase = now / 1000.0
            val pair = when (musicMode.selectedItemPosition) {
                1 -> {
                    val breath = 0.55 + 0.45 * (0.5 + 0.5 * sin(phase * 2.2))
                    (smoothedVolume * breath).toInt() to (smoothedVolume * breath).toInt()
                }
                2 -> {
                    val pulse = if (beat) max(65.0, smoothedVolume) else smoothedVolume * 0.10
                    pulse.toInt() to pulse.toInt()
                }
                3 -> {
                    val wave = 0.35 + 0.65 * (0.5 + 0.5 * sin(phase * 5.0))
                    (smoothedVolume * wave).toInt() to (smoothedVolume * (1.05 - wave * 0.45)).toInt()
                }
                4 -> {
                    val kick = if (beat) 24.0 else 0.0
                    (smoothedBass * 0.72 + kick).toInt().coerceIn(0, 100) to
                        (smoothedVolume * 0.72 + kick).toInt().coerceIn(0, 100)
                }
                else -> {
                    val kick = if (beat) 20.0 else 0.0
                    (smoothedBass + kick).toInt().coerceIn(0, 100) to smoothedVolume.toInt().coerceIn(0, 100)
                }
            }
            sendMusicLevels(pair.first, pair.second)
            if (now - lastUi > 500) {
                runOnUiThread {
                    musicStatus.text = "Sistem sesi · Ses: ${smoothedVolume.toInt()}% · Bas: ${smoothedBass.toInt()}%"
                }
                lastUi = now
            }
        }
    }

    private fun goertzel(samples: ShortArray, count: Int, targetHz: Double): Double {
        val sampleRate = 44100.0
        val coefficient = 2.0 * cos(2.0 * PI * targetHz / sampleRate)
        var s1 = 0.0
        var s2 = 0.0
        for (i in 0 until count) {
            val sample = samples[i] / 32768.0
            val s0 = sample + coefficient * s1 - s2
            s2 = s1
            s1 = s0
        }
        val power = max(0.0, s1 * s1 + s2 * s2 - coefficient * s1 * s2)
        return (2.0 * sqrt(power) / count).coerceIn(0.0, 1.0)
    }

    private fun stopAudioCapture() {
        audioRunning = false
        try { audioRecord?.stop() } catch (_: Exception) { }
        try { audioRecord?.release() } catch (_: Exception) { }
        audioRecord = null
        try { projection?.stop() } catch (_: Exception) { }
        projection = null
        if (::audioStopButton.isInitialized) audioStopButton.isEnabled = false
        if (::audioStartButton.isInitialized) audioStartButton.isEnabled = connected
        if (::musicStatus.isInitialized) musicStatus.text = "Müzik modu kapalı"
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQ_AUDIO) {
            if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) requestAudioCapture()
            else toast("Android sistem ses yakalama için gerekli izni vermedin.")
        } else if (requestCode == REQ_BT) {
            if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) refreshDevices()
            else toast("HC-05 için Bluetooth bağlantı izni gerekli.")
        }
    }

    override fun onDestroy() {
        stopAudioCapture()
        disconnectHardware()
        if (receiverRegistered) {
            try { unregisterReceiver(usbReceiver) } catch (_: Exception) { }
        }
        super.onDestroy()
    }

    private fun sectionTitle(value: String): TextView {
        val t = text(value, 15f, amber, true)
        t.setPadding(0, dp(20), 0, dp(8))
        return t
    }

    private fun card(): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(14), dp(14), dp(14), dp(14))
        setBackgroundColor(panel)
        val params = LinearLayout.LayoutParams(-1, ViewGroup.LayoutParams.WRAP_CONTENT)
        params.bottomMargin = dp(12)
        layoutParams = params
    }

    private fun row(vararg views: View): LinearLayout {
        val line = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        views.forEachIndexed { index, view ->
            val lp = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
            if (index > 0) lp.marginStart = dp(6)
            lp.topMargin = dp(6)
            lp.bottomMargin = dp(6)
            line.addView(view, lp)
        }
        return line
    }

    private fun button(label: String): Button = Button(this).apply {
        text = label
        textSize = 12f
        isAllCaps = false
        setTextColor(0xFF171717.toInt())
        setBackgroundColor(amber)
        minHeight = dp(46)
    }

    private fun text(value: String, size: Float, color: Int, bold: Boolean = false): TextView =
        TextView(this).apply {
            text = value
            textSize = size
            setTextColor(color)
            if (bold) setTypeface(typeface, android.graphics.Typeface.BOLD)
            setPadding(0, dp(4), 0, dp(4))
        }

    private fun space(height: Int): View = View(this).apply {
        layoutParams = LinearLayout.LayoutParams(1, dp(height))
    }

    private fun matchWrap() = LinearLayout.LayoutParams(-1, ViewGroup.LayoutParams.WRAP_CONTENT)
    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
    private fun toast(message: String) = runOnUiThread { Toast.makeText(this, message, Toast.LENGTH_LONG).show() }

    private inner class GaugeView(context: Context) : View(context) {
        var value: Int = 0
            set(v) { field = v.coerceIn(0, 100); invalidate() }
        private val track = Paint(3).apply { color = 0xFF35445A.toInt(); style = Paint.Style.STROKE; strokeWidth = dp(13).toFloat(); strokeCap = Paint.Cap.ROUND }
        private val progress = Paint(3).apply { color = amber; style = Paint.Style.STROKE; strokeWidth = dp(13).toFloat(); strokeCap = Paint.Cap.ROUND }
        private val label = Paint(3).apply { color = white; textSize = dp(27).toFloat(); textAlign = Paint.Align.CENTER; typeface = android.graphics.Typeface.DEFAULT_BOLD }
        private val smallLabel = Paint(3).apply { color = muted; textSize = dp(10).toFloat(); textAlign = Paint.Align.CENTER }
        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            val rect = RectF(dp(20).toFloat(), dp(14).toFloat(), width - dp(20).toFloat(), height * 1.58f)
            canvas.drawArc(rect, 180f, 180f, false, track)
            canvas.drawArc(rect, 180f, 180f * value / 100f, false, progress)
            canvas.drawText("$value%", width / 2f, height - dp(24).toFloat(), label)
            canvas.drawText("PARLAKLIK", width / 2f, height - dp(7).toFloat(), smallLabel)
        }
    }

    companion object {
        private const val REQ_AUDIO = 2101
        private const val REQ_PROJECTION = 2102
        private const val REQ_BT = 2103
    }
}
