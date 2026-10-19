package com.clipsapp.clips

/**
 * clipsapp — demo Jetpack Compose (Kotlin)
 *
 * ESTE ARCHIVO ES KOTLIN, NO HTML.
 * Ábrelo en Android Studio, no en el navegador.
 *
 * Cómo usarlo:
 * 1. En Android Studio abre: app → kotlin+java → com.clipsapp.clips → MainActivity.kt
 * 2. Ctrl+A, Supr, pega TODO este archivo (Ctrl+V), Ctrl+S
 * 3. Si la primera línea no coincide con tu carpeta, cámbiala al package de tu proyecto
 * 4. Run (botón verde)
 *
 * No hace falta material-icons-extended: usa solo iconos del kit básico.
 */

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.snapping.rememberSnapFlingBehavior
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val Bg = Color(0xFF07080D)
private val Fg = Color(0xFFF4F7FB)
private val Muted = Color(0xFF9AA7B5)
private val Cyan = Color(0xFF2EE6D6)
private val Mint = Color(0xFF7CFFB2)
private val Pink = Color(0xFFFF8AB7)
private val Brand = Brush.linearGradient(listOf(Color(0xFF2EE6D6), Color(0xFF7CFFB2)))
private val Surface = Color(0xFF121218)
private val Elevated = Color(0xFF1A1F2A)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { clipsapp() }
    }
}

enum class Tab { HOME, EXPLORE, CREATE, CLIPS, PROFILE }
enum class CtaKind { BUY, RESERVE }

data class Product(
    val name: String,
    val brand: String,
    val priceLabel: String,
    val city: String,
    val fulfills: Int,
    val wouldBuy: Int,
    val cta: CtaKind,
    val ctaLabel: String,
)

data class Clip(
    val id: String,
    val handle: String,
    val author: String,
    val disclosure: String,
    val daysUsed: Int?,
    val likes: Int,
    val comments: Int,
    val saves: Int,
    val shares: Int,
    val posterColor: Color,
    val product: Product,
)

private val SampleClips = listOf(
    Clip(
        id = "c1",
        handle = "laura.tech",
        author = "Laura",
        disclosure = "Compra verificada",
        daysUsed = 21,
        likes = 12840,
        comments = 312,
        saves = 890,
        shares = 210,
        posterColor = Color(0xFF12303A),
        product = Product("Pulse Pro ANC", "Sony", "89€", "Parla", 88, 75, CtaKind.BUY, "Comprar ahora"),
    ),
    Clip(
        id = "c2",
        handle = "barber.mario",
        author = "Mario",
        disclosure = "Negocio local",
        daysUsed = 14,
        likes = 4200,
        comments = 88,
        saves = 310,
        shares = 64,
        posterColor = Color(0xFF2A1A12),
        product = Product("Corte + barba", "Barbería Norte", "18€", "Parla", 92, 81, CtaKind.RESERVE, "Reservar cita"),
    ),
    Clip(
        id = "c3",
        handle = "sofia.eats",
        author = "Sofía",
        disclosure = "Opinión real",
        daysUsed = 3,
        likes = 9100,
        comments = 201,
        saves = 640,
        shares = 150,
        posterColor = Color(0xFF1A1230),
        product = Product("Menú del día", "La Terraza", "12€", "Getafe", 84, 70, CtaKind.RESERVE, "Reservar mesa"),
    ),
    Clip(
        id = "c4",
        handle = "diego.fit",
        author = "Diego",
        disclosure = "Tester",
        daysUsed = 30,
        likes = 15600,
        comments = 410,
        saves = 1200,
        shares = 330,
        posterColor = Color(0xFF102418),
        product = Product("Zapatillas Run X", "Nova", "64€", "Madrid", 79, 68, CtaKind.BUY, "Comprar ahora"),
    ),
    Clip(
        id = "c5",
        handle = "nuria.home",
        author = "Nuria",
        disclosure = "Compra verificada",
        daysUsed = 9,
        likes = 5400,
        comments = 97,
        saves = 280,
        shares = 71,
        posterColor = Color(0xFF301018),
        product = Product("Aroma vainilla", "Casa Luz", "9€", "Parla", 90, 77, CtaKind.BUY, "Comprar ahora"),
    ),
)

private fun formatCount(n: Int): String = when {
    n >= 1_000_000 -> String.format("%.1fM", n / 1_000_000f)
    n >= 1_000 -> String.format("%.1fK", n / 1_000f)
    else -> n.toString()
}

@Composable
fun clipsapp() {
    var loggedIn by remember { mutableStateOf(false) }
    if (!loggedIn) {
        Onboarding(onEnter = { loggedIn = true })
    } else {
        MainShell()
    }
}

@Composable
private fun Onboarding(onEnter: () -> Unit) {
    var email by remember { mutableStateOf("") }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.radialGradient(listOf(Color(0xFF15223A), Bg)))
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(horizontal = 22.dp, vertical = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(Brand),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Filled.PlayArrow, contentDescription = null, tint = Bg, modifier = Modifier.size(36.dp))
        }
        Spacer(Modifier.height(14.dp))
        Row {
            Text("Clips", color = Fg, fontSize = 34.sp, fontWeight = FontWeight.ExtraBold)
            Text("App", color = Cyan, fontSize = 34.sp, fontWeight = FontWeight.ExtraBold)
        }
        Text("Descubre, Elige, Opina y Compra Mejor.", color = Muted, fontSize = 13.sp)
        Spacer(Modifier.height(28.dp))
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Correo electrónico") },
            modifier = Modifier.fillMaxWidth(),
            colors = fieldColors(),
            singleLine = true,
        )
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(
            value = "demo",
            onValueChange = {},
            label = { Text("Contraseña") },
            modifier = Modifier.fillMaxWidth(),
            colors = fieldColors(),
            singleLine = true,
        )
        Spacer(Modifier.height(16.dp))
        GradientButton("Entrar a clipsapp", Modifier.fillMaxWidth(), onEnter)
        Spacer(Modifier.height(12.dp))
        OutlinedButton(
            onClick = onEnter,
            modifier = Modifier.fillMaxWidth().height(48.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = Fg),
        ) { Text("Entrar a la demo", fontWeight = FontWeight.Bold) }
    }
}

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = Fg,
    unfocusedTextColor = Fg,
    focusedBorderColor = Cyan,
    unfocusedBorderColor = Color.White.copy(alpha = 0.12f),
    focusedLabelColor = Muted,
    unfocusedLabelColor = Muted,
    cursorColor = Cyan,
    focusedContainerColor = Elevated,
    unfocusedContainerColor = Elevated,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MainShell() {
    var tab by remember { mutableStateOf(Tab.HOME) }
    var soundOn by remember { mutableStateOf(false) }
    val liked = remember { mutableStateListOf<String>() }
    val saved = remember { mutableStateListOf<String>() }
    var sheet by remember { mutableStateOf<String?>(null) }
    var activeClip by remember { mutableStateOf(SampleClips.first()) }

    Box(Modifier.fillMaxSize().background(Bg)) {
        when (tab) {
            Tab.HOME -> Feed(
                soundOn = soundOn,
                onToggleSound = { soundOn = !soundOn },
                liked = liked,
                saved = saved,
                onLike = { id -> if (!liked.remove(id)) liked.add(id) },
                onSave = { id -> if (!saved.remove(id)) saved.add(id) },
                onOpenSheet = { kind, clip ->
                    activeClip = clip
                    sheet = kind
                },
                onUpload = { tab = Tab.CREATE },
            )
            Tab.EXPLORE -> SimpleScreen("Explorar", "Categorías locales · Parla y sur de Madrid")
            Tab.CREATE -> SimpleScreen("Publicar clip", "Sube una prueba real de producto o servicio.")
            Tab.CLIPS -> SimpleScreen("Mis clips", "Guardados y publicados.")
            Tab.PROFILE -> SimpleScreen("Perfil", "Demo local. Sin cuenta real.")
        }

        BottomBar(
            tab = tab,
            onTab = { tab = it },
            modifier = Modifier.align(Alignment.BottomCenter),
        )

        if (sheet != null) {
            ModalBottomSheet(
                onDismissRequest = { sheet = null },
                sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
                containerColor = Surface,
            ) {
                SheetBody(kind = sheet!!, clip = activeClip, onClose = { sheet = null })
            }
        }
    }
}

@Composable
private fun Feed(
    soundOn: Boolean,
    onToggleSound: () -> Unit,
    liked: List<String>,
    saved: List<String>,
    onLike: (String) -> Unit,
    onSave: (String) -> Unit,
    onOpenSheet: (String, Clip) -> Unit,
    onUpload: () -> Unit,
) {
    val listState = rememberLazyListState()
    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            state = listState,
            flingBehavior = rememberSnapFlingBehavior(listState),
            modifier = Modifier.fillMaxSize(),
        ) {
            items(SampleClips, key = { it.id }) { clip ->
                ClipSlide(
                    clip = clip,
                    liked = clip.id in liked,
                    saved = clip.id in saved,
                    onLike = { onLike(clip.id) },
                    onSave = { onSave(clip.id) },
                    onOpenSheet = { kind -> onOpenSheet(kind, clip) },
                    modifier = Modifier.fillParentMaxSize(),
                )
            }
        }

        Row(
            Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(34.dp).clip(RoundedCornerShape(10.dp)).background(Brand),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Filled.PlayArrow, null, tint = Bg, modifier = Modifier.size(18.dp))
                }
                Spacer(Modifier.width(8.dp))
                Row {
                    Text("Clips", color = Fg, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                    Text("App", color = Cyan, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(Elevated.copy(alpha = 0.8f))
                        .clickable(onClick = onToggleSound),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        if (soundOn) Icons.Filled.Notifications else Icons.Filled.MoreVert,
                        contentDescription = "Sonido",
                        tint = Fg,
                        modifier = Modifier.size(18.dp),
                    )
                }
                Box(
                    Modifier
                        .clip(CircleShape)
                        .background(Brand)
                        .clickable(onClick = onUpload)
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                ) {
                    Text("+ Subir Clip", color = Bg, fontSize = 11.sp, fontWeight = FontWeight.ExtraBold)
                }
            }
        }
    }
}

@Composable
private fun ClipSlide(
    clip: Clip,
    liked: Boolean,
    saved: Boolean,
    onLike: () -> Unit,
    onSave: () -> Unit,
    onOpenSheet: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(modifier.background(clip.posterColor)) {
        Box(
            Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        0f to Color.Black.copy(alpha = 0.7f),
                        0.18f to Color.Transparent,
                        0.58f to Color.Transparent,
                        1f to Color.Black.copy(alpha = 0.65f),
                    ),
                ),
        )

        Column(
            Modifier
                .align(Alignment.TopStart)
                .statusBarsPadding()
                .padding(start = 12.dp, top = 96.dp)
                .width(220.dp),
        ) {
            Row(
                Modifier
                    .clip(CircleShape)
                    .background(Elevated.copy(alpha = 0.8f))
                    .padding(start = 4.dp, end = 8.dp, top = 4.dp, bottom = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(Modifier.size(36.dp).clip(CircleShape).background(Cyan))
                Spacer(Modifier.width(8.dp))
                Text("@${clip.handle}", color = Fg, fontSize = 12.sp, fontWeight = FontWeight.ExtraBold)
                Spacer(Modifier.width(8.dp))
                Box(
                    Modifier.clip(RoundedCornerShape(10.dp)).background(Brand).padding(horizontal = 8.dp, vertical = 4.dp),
                ) {
                    Text("Seguir", color = Bg, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold)
                }
            }
            Text(
                "${clip.author} · ${clip.disclosure}" +
                    (clip.daysUsed?.let { " · $it días de uso" } ?: ""),
                color = Fg.copy(alpha = 0.9f),
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(top = 8.dp),
            )
            Row(
                Modifier
                    .padding(top = 8.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color(0xE60C1822))
                    .clickable { onOpenSheet("tried") }
                    .padding(horizontal = 10.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier.size(18.dp).clip(CircleShape).background(Cyan),
                    contentAlignment = Alignment.Center,
                ) { Text("1", color = Bg, fontSize = 9.sp, fontWeight = FontWeight.ExtraBold) }
                Spacer(Modifier.width(6.dp))
                Text("¿Lo has probado?", color = Fg, fontSize = 11.sp, fontWeight = FontWeight.ExtraBold)
                Spacer(Modifier.width(4.dp))
                Icon(Icons.Filled.Info, null, tint = Cyan, modifier = Modifier.size(14.dp))
            }
        }

        Column(
            Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 6.dp, bottom = 148.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            ActionBtn(
                icon = Icons.Filled.Favorite,
                label = formatCount(clip.likes + if (liked) 1 else 0),
                active = liked,
                onClick = onLike,
            )
            ActionBtn(Icons.Filled.Email, formatCount(clip.comments)) {
                onOpenSheet("comments")
            }
            ActionBtn(
                icon = Icons.Filled.Star,
                label = formatCount(clip.saves + if (saved) 1 else 0),
                active = saved,
                onClick = onSave,
            )
            ActionBtn(Icons.Filled.Share, formatCount(clip.shares)) { onOpenSheet("share") }
            ActionBtn(Icons.Filled.MoreVert, "") { onOpenSheet("more") }
        }

        Column(
            Modifier
                .align(Alignment.BottomCenter)
                .padding(start = 12.dp, end = 12.dp, bottom = 62.dp)
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(Color(0xC7121218))
                .padding(horizontal = 10.dp, vertical = 8.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f).clickable { onOpenSheet("product") }) {
                    Text(
                        clip.product.name,
                        color = Fg,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.ExtraBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        "${clip.product.brand} · ${clip.product.priceLabel} · ${clip.product.city}",
                        color = Muted,
                        fontSize = 10.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                MetricChip("${clip.product.fulfills}%", "Cumple", Mint)
                Spacer(Modifier.width(4.dp))
                MetricChip("${clip.product.wouldBuy}%", "Compraría", Pink)
            }
            Spacer(Modifier.height(6.dp))
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(36.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(Brand)
                    .clickable { onOpenSheet("cta") },
                contentAlignment = Alignment.Center,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.ShoppingCart, null, tint = Bg, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(clip.product.ctaLabel, color = Bg, fontSize = 12.sp, fontWeight = FontWeight.ExtraBold)
                }
            }
        }
    }
}

@Composable
private fun ActionBtn(
    icon: ImageVector,
    label: String,
    active: Boolean = false,
    onClick: () -> Unit,
) {
    val tint by animateColorAsState(if (active) Mint else Cyan, label = "action")
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable(onClick = onClick),
    ) {
        Box(
            Modifier
                .size(46.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(Brush.linearGradient(listOf(Color(0xFF08303A), Color(0xFF041820)))),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = label.ifBlank { "acción" }, tint = tint, modifier = Modifier.size(22.dp))
            if (active) {
                Box(
                    Modifier
                        .align(Alignment.BottomEnd)
                        .padding(4.dp)
                        .size(12.dp)
                        .clip(CircleShape)
                        .background(Mint),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Filled.Check, null, tint = Bg, modifier = Modifier.size(8.dp))
                }
            }
        }
        if (label.isNotEmpty()) {
            Text(label, color = Fg, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold)
        }
    }
}

@Composable
private fun MetricChip(value: String, label: String, accent: Color) {
    Column(
        Modifier
            .width(52.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(Color.Black.copy(alpha = 0.55f))
            .padding(horizontal = 6.dp, vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(value, color = accent, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Text(label.uppercase(), color = Muted, fontSize = 8.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun SheetBody(kind: String, clip: Clip, onClose: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp).navigationBarsPadding()) {
        Text(
            when (kind) {
                "comments" -> "Comentarios"
                "tried" -> "¿Lo has probado?"
                "cta" -> clip.product.ctaLabel
                "product" -> "Ficha social"
                "more" -> "Opciones del clip"
                else -> "clipsapp"
            },
            color = Fg,
            fontWeight = FontWeight.SemiBold,
            fontSize = 16.sp,
        )
        Spacer(Modifier.height(12.dp))
        when (kind) {
            "tried" -> {
                SheetOption("Sí, tester verificado", true, onClose)
                SheetOption("Sí, uso casual", false, onClose)
                SheetOption("No lo he probado", false, onClose)
            }
            "cta" -> {
                Text(
                    if (clip.product.cta == CtaKind.BUY)
                        "Demo de compra. Código CLIPS10 — 10% dto."
                    else
                        "Reserva o contacto simulado para ${clip.product.city}.",
                    color = Muted,
                    fontSize = 12.sp,
                )
                Spacer(Modifier.height(10.dp))
                SheetOption(clip.product.ctaLabel, true, onClose)
                SheetOption("Seguir viendo", false, onClose)
            }
            "product" -> {
                Text(clip.product.name, color = Fg, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Text("${clip.product.brand} · ${clip.product.priceLabel}", color = Muted, fontSize = 13.sp)
                Spacer(Modifier.height(8.dp))
                Text("Cumple lo prometido ${clip.product.fulfills}% · Lo compraría ${clip.product.wouldBuy}%", color = Mint, fontSize = 12.sp)
                Spacer(Modifier.height(12.dp))
                SheetOption(clip.product.ctaLabel, true, onClose)
            }
            "comments" -> {
                Text("@sofia  Se ve muy cómodo. ¿Aguantan el metro?", color = Fg, fontSize = 13.sp)
                Spacer(Modifier.height(6.dp))
                Text("@marcos  Yo los uso 3 semanas. Cumplen.", color = Fg, fontSize = 13.sp)
            }
            else -> SheetOption("Cerrar", false, onClose)
        }
        Spacer(Modifier.height(18.dp))
    }
}

@Composable
private fun SheetOption(label: String, primary: Boolean, onClick: () -> Unit) {
    val bg = if (primary) Cyan else Color.White.copy(alpha = 0.08f)
    val fg = if (primary) Bg else Fg
    Box(
        Modifier
            .fillMaxWidth()
            .padding(bottom = 8.dp)
            .clip(RoundedCornerShape(13.dp))
            .background(bg)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 14.dp),
    ) { Text(label, color = fg, fontWeight = FontWeight.SemiBold, fontSize = 14.sp) }
}

@Composable
private fun BottomBar(tab: Tab, onTab: (Tab) -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier
            .fillMaxWidth()
            .background(Bg.copy(alpha = 0.92f))
            .navigationBarsPadding()
            .padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceAround,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        NavItem("Inicio", Icons.Filled.Home, tab == Tab.HOME) { onTab(Tab.HOME) }
        NavItem("Explorar", Icons.Filled.Search, tab == Tab.EXPLORE) { onTab(Tab.EXPLORE) }
        NavItem("Publicar", Icons.Filled.Add, tab == Tab.CREATE) { onTab(Tab.CREATE) }
        NavItem("Mis clips", Icons.Filled.Star, tab == Tab.CLIPS) { onTab(Tab.CLIPS) }
        NavItem("Perfil", Icons.Filled.Person, tab == Tab.PROFILE) { onTab(Tab.PROFILE) }
    }
}

@Composable
private fun NavItem(label: String, icon: ImageVector, on: Boolean, onClick: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 4.dp),
    ) {
        Icon(icon, null, tint = if (on) Cyan else Muted, modifier = Modifier.size(22.dp))
        Text(label, color = if (on) Fg else Muted, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun SimpleScreen(title: String, subtitle: String) {
    Column(
        Modifier
            .fillMaxSize()
            .background(Bg)
            .statusBarsPadding()
            .padding(20.dp),
    ) {
        Text(title, color = Fg, fontSize = 24.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Text(subtitle, color = Muted, fontSize = 14.sp)
    }
}

@Composable
private fun GradientButton(label: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(
        modifier
            .height(52.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(Brand)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, color = Bg, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
    }
}
