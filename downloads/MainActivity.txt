package com.ClipsAds.myapplication

/**
 * ClipsAds — demo Jetpack Compose (Kotlin)
 *
 * ESTE ARCHIVO ES KOTLIN, NO HTML.
 * Ábrelo en Android Studio, no en el navegador.
 *
 * Cómo usarlo:
 * 1. En Android Studio abre: app → src → main → java → com.ClipsAds.myapplication → MainActivity.kt
 *    (NO abras AndroidManifest.xml)
 * 2. Ctrl+A, Supr, pega TODO este archivo (Ctrl+V), Ctrl+S
 * 3. La primera línea DEBE ser: package com.ClipsAds.myapplication
 * 4. Run (botón verde)
 * 5. Para vídeos: el móvil/emulador necesita internet.
 *    En AndroidManifest.xml, dentro de <manifest>, debe existir:
 *      <uses-permission android:name="android.permission.INTERNET" />
 * 6. + Subir Clip abre la galería y añade tu vídeo al feed.
 *
 * No hace falta material-icons-extended: usa solo iconos del kit básico.
 */

import android.media.MediaPlayer
import android.net.Uri
import android.os.Bundle
import android.widget.VideoView
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
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
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
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
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView

private object BrandPng {
    const val LOGO = (
        "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"
    )
    const val LIKE = (
        "iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAA1t0lEQVR42qW9aZBk2XXf9zv3vpdb7VXd1etMzw7MABgMQICDhSBIk6IEgKBJQmJQCikYYthh" +
        "OawvDobD/mDKDivosPXBXx1hR9ALbZoiaJKgSEGCLRgEQGEZCOsAs2Cmu2d6enqvvbIy8717jz/ce9+7L6t6AIU6IqOyKysz3zv33LP8z/+cK/z4/wQw4XHJ" +
        "wqBkoRrSOxpQy5DCFngZYMo+hQqm7FmrBkFRxGHFivbxUmDVAGBMoaoCgEoBiBexRigBwXvvRRyq1ogtAfDeY5gB4lUNxhicCiAIlRHTRyhRP/MqNaLOiBSo" +
        "VigVgIdwAUYtXmtRU7d36R1iHM57xHmMrZlp5cQ7pr7C10fUvsLYGuNnzPyM5WqHW7eO5uSl8fEjhfpvI3zgzIBRf5lS+njpU5geg2KZ3rCHzgyTiWE8GXF0" +
        "BG7qwYzAFmAsRvpgDHgXPs9YjFpM0ccDeMWIBWODjETBO4yUqC0RrZtr9l4xRuJNmva2pcAgeO8QcXivoDXgMVLipQat8b6Gug7XYwTUgXd44rV5h/dTjFVE" +
        "x/TLCQsLnuGoxhQzpt4xPhjjmFBWBzhzyN7gEF6p4jVqWOt/twWQ9vGUZW0yRGaLVDpiYXGF/mCJ/b2CrSsGWDCYdXP60mm5cHHFntkcmcXFvha2xEtP0T6q" +
        "hYipsOLV+xKkACmBAkBEgsqIeMAC1ouqURGBApFKUUTpgzjweCQugEZtkyLcvNQioqjHi8xABaclImpUvRdTiWiNYlBEVY0YOfJobZDCK7WITkxVzzg8HPud" +
        "e7e5+tq0vnX5tsffA8ZsXPIsLTsOjvaZHh3ge3scTvbhRh2FX/+7LIBptetSyeJsEVsuU/ZWWBou8vrrPdzueu/0I4/Yj3/8CfngB57yjz72AJvr67ow7FOW" +
        "RqwBa4JQlSAjBUQQE2xT0BFB4pV41eY52orVGGn2tNF2j4cnCl5Jb9RGAeMtqo//lfbvFTT+lLDo8f/avicqBV6R2cwzrY5ke3tbXn/tNfnqv37e/cmffn96" +
        "59WrsLrHg5dqxgdHTOoxzu2zON3lzukZ/KB+K3MkP0L4BcsXlygYUvkF1tc3uHNvifGN9eFPf+K98ht/76P+/e99pz9zeuRmY/zd2+i9O7C7g4wPVSsXb0RB" +
        "JT7SIgDOH78szZ6oZKsg3T8QiZvcd29D40Jo9sHpb4mv+fSZ8f9pxbM1S4qCtVAU0O+LLC0jG6eRzXPY5WXM9vah+eY3v+v+l9/9V9MvfvYr9DfGbF6o2dra" +
        "oa87uOKA3rjmzkoFr0x/3AWIX/9Uj9GddcrhiL5dZLSwxtXnB4O3ved98tv/6Nf8Rz74dCUV+sqL6I3rnoMDUBXEICqi6abVtx/rk0AzrdV5yUsr+CR8DToR" +
        "5JoJTiXudGkvW/OPyxYrCX1+cUymFNpeQ/PxzeL44He8gqCyMEIuPmjkqXdii56ab33rm/53fucPZt/+q69z6Z0Vh0dTppN9fH+XHlO2Lx9BCAJyNZOTbf5P" +
        "WIa3T2NllWG5Ss8O7PWXV/u/9dt/0/+D/+BT1cD23De+oty9Fe7IlhIEHIVauyhg37055fhzn+3O9FTSQmgr1I5dyhctXrJk5mZ+9+QGoLMA8X2N+zCZCmqI" +
        "AURAbFgoJPw0cXXqWbjhM+eN+eCHKE0xs3/wTz8z/a9+6/90px7boSw9+9t3cXafnj1kMJ1x69YEcPdbAAuPFSzsrSKDDRZHp3GTgblz4/zgf/29/6j6pY8/" +
        "W3/n6+hLz3uK0mDLIGTnuz9r32p4enS0LArIp6AwF5KcYIpOuFq9z16O3yHRHOmxxWpNlTQ+Y970kO2EIHwVCS+nBbAmmCcj4Gqoay9PvM0UP/Uz2C998fvu" +
        "N/7uP6ls/xpLa579gy16fgdfHLDkJ7zxxpTG+3WEf7HHUNYo3BKLC5vURwvF0fTh8vf/6W/Nnn3mUff5v3Ds7xnKvuBcK/Ak/NoH7Xc+rnFaAN9qexSONrvB" +
        "d4I1mbNaKIhmpgSC846CkmaD5E407az4nkzL5YQV02OLme0okRCpNvGgCf+3prsQ1sJsorIw9OaTv2KL129cc3/3b/+Tem/3JVbXKg4PthHdCuHqmX34N1V+" +
        "FQJPlSxuL2OKFYaDU5hq1ezuPlj+4R/9o+qZJy/6z/0zh6oVsWgSvssF7qGq20XwGoTT2QHzOyHtgtxkHPdGx/41TjkXcjAtkml9kPtcTKTaMWeq3Y9JDltl" +
        "7rONaX2GyRbBSrsAhY0Rl3f2l3/VFne27rhf/5v/be15GVuMmU3vMjX3GB/tw50x0SsGD7f2yBK+XgdZYWlwxrxx+Uz///rD/3L6U88+rp/9E6e2sIgJuUsS" +
        "fO2gcu0iNM+j1vugieK11drGqSqigqqP2muaBYjZQEihAW2CspMWR2MSzHEnrBpf7X6/ZLZfMwcudONblbizjLT+wQhibTRFaREMUljUFGERrCCu8uZTv2bK" +
        "V1694X71l//r6uzFN5lN9vH+Drg9ZLLLvXv7Nnz7mREjlhFdZnn1NNd+sND7b/77f+g+9cn3uM9+xuHVgmSCrmFWh5/TCqbp/5kZqjKz5H1YFOcRp4jziE//" +
        "93GRPOJ9ijYQ5+JrPmitU0R90rBmN0l8hAXX1vnHXSoaPz9+p/jcbMb3R9RB4/VoDB7EZybUu/B3qqjTTMlyP5d8C6gxoi/+wOnP/7Xl4uFHz9Sf/t1v2NMX" +
        "0UltoRCmgynV9sQCBSsbI5xbtYuLZ/T2tcXeL3zyr8t/8Z9+ava1L3v29yy2aG6Iqm4fSfC1C4KuXNghtW8uPAm4MVPp957sBoJAVH27OB0nHhenifNpNTaF" +
        "pj46jyjUdrdp/Oy0UIrG71dN1+Q639ksavoMF38fr1k0LqZLpjbuoJTwadwpzhl94w1vPvGJi8XtnaPqq1+8YtdPGa1mHjs9YvLg2LJyaRlTLWP7p7Uo1s3R" +
        "+EH7P/x3/7DS6UhfehH6A5G6DgtQ1zCrgtBnx7VeGn+QCz9ofaPJ0TeQbiIJJWmcZsKn1XJQtPFYGiyCjbZapHXmGsGJaH7afCN9fvje4LDbXSPZ90pUhlY5" +
        "5q5NtfNauCffNbHeI0UJOzvoaID94IcelT/9sxecKQ7x6qjMhN6hs5TDJYreGgvDTa5fWSz+43/wS+4TP/9e/5V/7aUoTBBoFH5H8114JLtfu3Zbu7R9faNt" +
        "pLCaVugdAczlDJ2IJneGluD4CO81RE02bR4hWaInPvoUDULSpLHJHJHvstzsZMJXf+x3bTjdLp4m/9I4EY/0eqJv3lD5wE8OjBRD9//8+Qv21OZUfV2DcZbh" +
        "+lnKYhNj1k1dn7e//Z//htvfHvDmTZGiEGoXtL5yQeOnaSE8UuXRkG+eJ23RLB5vbLbPTEJus1XRFNbG96UF05T5WkGsIHjWN0Z89Dffz9Kz59n74T2qcYWI" +
        "ZMJvNV0yLRalFX78f/P7fOGIryUlSPeSTGX6nCaokHaHN+FlzBmqGWrAPv3u0/z55151yj3UTXB+32AZ2H6xyO3b/eITv/hu/+DFdX74KhSlaBPp+CD4SdV1" +
        "unkk1Ag/aH0nVE27yLnw+8w8qQtaGRLY1lyo16DZ6qOtjw8raF3x5Mce5+7TS3z3nQULn3gkmDlDiwKnXeSj1scgoOtz5h2pbxSE5Giz92my+U7be68dQU51" +
        "aw0yPymzCowRfeFFdGNtaD72N97J3dsj2x8uYooFg5Metjeg2l3g5z7yXj8+QA/HIUBuop1obpL9r4LQNQ9Bk8Zl0Y34bAGa6CNEEWGRutFDC0+cjBWFUN/R" +
        "WxlQP7nIFbdD7SYcPTmkXO23piiHUlUDeqpB4Bp9UdL8dH0aw2fNrydLMrV2zQ6VOR8g6f11uwAa5RRkpMj+obqbN+FDz77d+GpNrV1AzGKBlb6bTqxZPn9O" +
        "H3rwEb32eggwUqxfOSR+kFQeqvZiU2iovjU10ok+NA/VO0KVBqGkC7xJgPZVNCY/bVAuBtR5lh9YZbZeMHEzEEO9binPD5n94AiMafKHZCY0i26CadYTEz3N" +
        "s+X0txnUl/ApT4QxUtpuJPgVTbA2oRRgBLEm7HxFuPoaPPDAWT114bRW05sY6RnK3gKHRyP75BMXdG15We/cBTHShJWN8F1m57UJ37TRdJdt8WhC0m6IJqdx" +
        "zo1gfGNmNJoEVRd/l+EVomAUNcFxLz++zMRAHSGOmYHysaXw94Y2KSMqQI5F+SzZyn1VemQxvcTdkxaSZD7Vob7uyqIJVlz86WPUWIddgIjevKUsLg7tE4+f" +
        "Ze/A0Ct6xtpygcPx0Dz26Hl6PTgYe1SiDWvtmVYOraLZcF2HK66NlTUmNGQOL/1OYywv0I14vI8Ol278nkVBYgQVMKUweGSRCY5agn46QB9dxPRsdNmNR20j" +
        "FJ9/XrBzzc7wmfCz79bm+lyoWGpK0EC8NJGcuq5iShaYaPIFAHsH6lWRhx68wGQ6whhbaI8RftbT82dXdRbjfFu+NdwQM9b5LU5uhqArwOx3KeXvoAlZBUqN" +
        "5IBk+L8JfzNa76EXF5iqxyWEUj16cURvtcfk3hEi+QJqgwHpHNbULHqOSDeIhmZQRY7SeryApK3mU0khRnaShc1OwDhwNi5SDZMpcmZzBe8XbWH7RQRhLKsr" +
        "A51OQ0JFgdZdH9CYnyZ2jyFZdJjiT7CfJy1Guim9H2EggnhNoSoukwG8Y/HCiHq5oK58XFUBp8xWSnoXF5ncOgwSkTnfkmE8TUkzJWsJEk/lTN8aMTN3nYqE" +
        "BZYWstWmXhF3AAThSwxDax/k6T3MZshoYQgyVGVkQmZTLoqyRFW1EUGCF+poPpxrTEsLLSQMpxW45tlhE9L5Y3hJ8/fHbjAH0rSJflKIOXpkhQqDI1NZb5gJ" +
        "FI8EP6AmeU45VjyQHK7OkFrNIxuNcEP8ff4g0gCCGQp+IfgvFwKSGJQ0xahogqX24JxQVQjaE7F9jBTtDlA1QeCKEIVd55BzGx9riuOzqEKQYFp8Zo7mooum" +
        "yN1o3gmvNzB81OIY/6soRb+geHSZMcIsla4lIJUejz60gO0JzmuHz9GgnakY32GMtIV5aa6rWyOQ+EHaRGppEWOuRajGpt1LB3fShvFCDL29YjAYVBPILUY9" +
        "JvxRLZrKih20MsLKMZppdncHgYxJVbyRjobP/8wyZDnBDDV4fdJ+VZbWh7hzA9R7phIWQFXCYtWKuziitzEMCmAUJUZTknZT7m/ymrNvZBoEaDICQdJ+H4XY" +
        "LXF2BJ7vXp+sge/CLGE5vSKCSmkQeogpUJVO5teEmll2mFL4bKtJVnjpRBqdAkyChX27KNlCNMCYerRNGlo/UASwbfGBRY4WCowTqsSYURPstjNUyyWDSyvh" +
        "ukVS/Bi/y+dZ3vEyZpa7JQKMKo3wVX0T2CYl897jox9UlRAZaTeRS5l+g1N5BcRh7AC0Z1AZYaRAoms6AYyax701QzI1rrbMaXUbgfim4C3NZqYN/dJFxUpV" +
        "ii6CHRfUxrIfntETK1RikSR0bGa4CiYKxRPrDY9PkMhsaEs2nTCog77m/CTtUHkkszpNrdlrVsPOGCA6x3AQQSQ6Jd/UzIch45Rp5GjaHs4X3Tg2puYpPfc5" +
        "bNyanxx4O6G42tyAZjcic1WrzkVKZr8NiBVUlOFCD/fYEqDMmipYVs0yBnVK/dgyvYVe2Ek2dypzV5YnZ5m57DrcE4O0Y+YzJZMZfaX57KRkqcij6pNSiBdK" +
        "gzE1IgWettCeYfo41wJsjWdvbb/mWt9ofADQgmMziAomRjWtCZr3EYk41cbRYmIN1ntWzy9zsNmjdIYjIdP+6IxNAbUwOzugf3E5XH9hYvkwu84G0cyL9BIT" +
        "M9+YHdEulKG0IbXO+TGZr3Xnmb4PiZw0Fby4L4yUIAODeot6be5fyaKCBHe0kIKZA7oyekPE3WOIllL7ZDc1LIymxKlZpBDCgc++PEU+kTXqHSvv2ODQWga+" +
        "YCyp0msaPxB+lkx6huHTZyIsEXZPKCVoh27SDXuzqCfmOcd2gd4nbJ7zZaKZ2c1BvZzdFxABY4J6ShF2c1Tn+Tqn77IZuiwH36ToaauZuL9UJb7NZ/BwLFLg" +
        "T6ZLSozpjLTmx8BwqQ9Pr+Oj3a+SAdLoLKJPENvDzRSePkNvqR+cuAGNBOg26DvuDqTZgD8OX/k4magNYLtgJHmZMpU3G0mrGFRrRDwOiS+GVW3MUBvXq7YR" +
        "QG7PJati5TiM5gX0qLOSopwUkkmWMUpWeCkM0rPgHWeeOMW98wOW6oKxRLqCDyFoEyp5QW0BleHw/BJLb98M0HlhwqKKtLQTOJa1M5+3qZ7wyKpuGayhmX/M" +
        "A62WidGtT6NaIKag4dWrWFQl2MaYZUcNT9Wf5pGn7jmpRvNIwEcAy79FQpalOSYKPVH1CwKruhCshYUPn2MLx5qW7OBoU10bHt4izoBaxA4Y4+j/9KOBMWkF" +
        "KWIkZWI505iGfNVhxzXkITPPzW9SMYmms0nPsnuUFO3l7494VeuYBfGIIoURdQYkGHZPkXg8mheyszJdsoHiMxp4Ay34Lsdzjkh1YlRhpKX6pSJ7EYXUM6ib" +
        "8eCTZ9h+coWlugBTMtEgeCVaUA1hKSqIEygG6Nhz8I4zrL3rAbSuobSobU1bJ3LML1PSPfnjZkfTzotmz0snnRAVdM4cnfwZKXyUApWRia6/bjxkhufP+wDJ" +
        "QDdtbHmLHIrO4eh5kUOk0bbO/w2N3ddCoDRoadBS6Q9LVj/xGG9KzSVd5I56kDLwNbUIZsgnXyPxeYGUC+zh6P/7z9AblagFKQxqI6PN0DbGyEkk2SzCa4ja" +
        "Mkfk1nZR4u4X3zU5clKk5zTWnUypSN8gYhEpAS8NybaFnDtgVahuxKgl3xFp5+R4SoajZIIP4aWJvjMVWqLmFwYKwQwtuJqnPv4UP3yoz0bdpzQ97uHBG/BB" +
        "+xsqu0ZTpCZYx3IIU8vdR9Y588n3wHQG/QIpWyYbRhuaoRg53kOQTEeLDrb5S2e3SxdszRxvW0/KaDZh4SxBXSYxDNVKVGtVuiimb7PENkGUBrhqWANZoaPD" +
        "2mwcX7S10QSo1cipJGS6pSBl/Dmy+NmUt/3kJbZ//jwHs4p32BWu6Az1NmTKGoSdcEQ0+gFvkVrC8/4i06Oag489w7kPvx09OoKBRUtBi8jjTB08hQ1O35ou" +
        "nn8sIsqreHocx+CkYtIc9uUcqKqiDhUtYkJTq6oPVL4s5NS8euUz967d1Fukw7f3CUIWAq0792Rp25uWZkIh0LPIwKL1jMeeeQD5O09x1R3wE/YUu6rcUw11" +
        "ithgmcLP1hablkNaKdrvIYVl2zk2//7Pcm7iuPGNl5HBILSXBTwk4jXRoYsD1zJ7NJkV0WNNHykTIXJbQ2qrETbpFpwarDiaoNwhGrz3iPSp/TBxXpLgm53A" +
        "HGGK+ZwmwVS+Za0l5xorWkHj46M00DfhZ8/AsED7gmrFOz/8OP3ffIYXi0OelHXWzALfdzPEl2g0P/ig8TiDENiVYRfE12YKUw92gDDgdlHg/5Nf5IGfeQam" +
        "k+AT+jZ8vzVI/IigFGF3SDJNxkTYJtyPmBDliJgolm7FTH0rv7YgpW1nT6iZKCoO8IU31M3eCtsjg0+TCXJtLN8JdLTFWXLooMHyaeJ6TU0OUeOlMGgRfAG+" +
        "Zm1pgcc/9k5uf3STq/UO79INHrOr/Mt6j1qLJukSn8oXCSqIoJFmnbQKTMM9ymCAeM8t69n4D3+RRx+6wK0//gL79w6gLJGiaInERjq5jzRVv5ZwpVlAohKT" +
        "QZG5eEfafKhjpiXJV4IT8xRGVbxopVCHL45Szmq82sE7MtsmmTkxAVALdBKyaCPuhMJgIp/e2wRg1SyPhlx6zyP0f+FRvnvWM5nt89HiApsy4l/UO4y9QULt" +
        "AvFFpD6GIlFoAhQwPaQoI3fUtAtx5EKANxggAvfqmsO/9pOce9djbPzzr3Hva8+zv7UXcKSiDH6tDjwe72MRypiMC5oxKY6DplnxJi99pGhoHn8Ui0pRhK5y" +
        "W4ZKp+mQS8O7TLSvLosCtEUro6A14i4hnrdt8mMFb2N8rA4UBr0+py5ssPmuC/if2OTK+ZJdPeTB2ZB/r3yUu+r5TLXNTG2w+z4WuGuPTqfo7gGMpyx5Cyoc" +
        "OEX7fVhZQ/ojtDBtzD524Cp0NECKkkntuHL2FMu/+StsfuzDnPnK8+x98wV2X7vJ9HAaTEppgbKF4p2CI/Jcfci6fVMdaKp87UqE/CRvWUh9gjFU9Yg4L2KL" +
        "Fh7EJ75kW3CO8X5GGUhIAA3OQgMdaHSq3pqojQHSKG3BwuqIlYurLD5+Ct6+zt6DI37QVyoqHnaGX5RLLBV9/srt8z09AsrouILwpVL04BC5u82HBms8fP4C" +
        "9bDHocDeeMaNG9tcvnaH+vQpWFiCshcb3iVEHtUUHQ6wvT5WhX1fsXfuNP1f/RusfvJnuXD5Ovr8K0y+/woHr99gvLWHm9Whad/YgKxqEemVWd+Dz3rbdK7F" +
        "TNuu5bauECIGFSkNKgVePKI+UQU1LxM20U/X/jeJXXSoamPhIzqgsrQMT40YnV9hcGmF8pE1qgeWqE73uY3FoKyq8MG6zxkZ4DG86Kd8R/epPYj0QqjsY5Wp" +
        "djAe07u7za+cfpDFixtcpWILzz1gvNhnYfMBHnpth9cu36LetOiigXIQOhxVYKIwm+FKjw57lL0+pTeAY6fssfW2Jyje9g5Gn5qxfGeb1cvXcC9dpnr1Gkdv" +
        "3GSytUs9dUE+xkBpQxbuHOJSCdJ0vGO+HMkrBCXWxPvQAlEvYsMda8YcmGcxRLhBI06tNqbskxq70Gd4dpnFh9YZPH6K4pE15MIirAwoMPSAAcJIhaEvsGI5" +
        "xHEXx7f9Adu4JqESDOpC9YyY3crUobe3+JmV09QX13jFT1AMW6rcwzBW5a6OGVxaZWVcc+/GNlIMwzUaE9HhWEmrBT+tmBVK1SuxvZK+FXqFR6ioTMHk9Fk4" +
        "fRH77IcoqVi4t8PStev4V65Sv3SF6ZVrTG5tUR8ehSZuWwRUQLTb+6gtVpqjoaqiOKZAVaDM1NVjVJ10ilpZ4b0T0/rAd1Rl9cIKp3/2MfpPn2V0aZ3ewhCD" +
        "jUh96Drx3jNB2RfPG3h2mXGYCiIaATQpo6MSlCIVLYLjdR49nHC6EsqLa7ysh6zS4xqeNxGqaKJM1WdyNMM8eJbeG3tMdw+hNwrJHQYoIsQjoYOzBp3W1OKp" +
        "jXBYFoi1FIXFGkNhZmAMVWGpNjbQjdPYZ56hABYO9xldfQP33RcYf/Yvmbx5JyxEnc0YOIFm0yIK3iJYVKUIgzF0Gi5L5+wXDZ0jQQwigtaexfMLPP2PP05v" +
        "c4NDpkx1xkF9wFiVI1XGKEei1I0amLbOqBmUgITNJxFSiLiKxiKLeI8ejFkfDnil59h1yi0qttRQUyC1oDODnwqMayZLQjlahK0xsqyxFpAncFlWqBksXiuq" +
        "NZU4qkh1SU14xswwIhgLUlikP0KeehJ9x5OUH/0I5X/2j5ndvIsxtjOJ4Tg5IfkBQYwpQE2Bp4exA1WKti0oo9MgUTt9G9fPaoqHVnh+03N0+DoTE/1BJweI" +
        "gk5ZoLSxeihDxP9LDBu9jYBW7JiMGa5WCkcOt1xyF8ee93iJr1eglcBM4AjYDywEJ32YjMN7Sw3QR2fqjmQLES20D9cSw3PyXs2AAfgMB5pFc+KZnj5N79FL" +
        "yOs3YBh76SL+lcNLeWNhXs0vQglLjEQV6WA5nfJaxijrWQ6+f5viW1eZvHsjMBxqhSoKJvXRikGNQcWePCHBmEzrUxRhWl6Oj4mWM4wnNRM8vo4JUi3oTGAa" +
        "ki7GHnbr8L5xHbLhKvxdQ+DKhS9Z62ks8DRolsu7eWijHpUQEZU9xBaIgeKvnqN+/kWk3w8UlCzg7yDwnWI+DvUzEFdE4Klo0st8kMZ8pSeFVRbq/Qp+5xv0" +
        "nt5An1qDh5fRzQX8sAhCnynMfBCwLULGWZaotSHxMTbAUEYCFComRCyODOaNC1SWHGztUcw8HDmoy8C1nAkcaYhwDmo4dMjiAL29A71ByJq9DViPTbGzbYNy" +
        "p0jibdYZEzB2/KgSiMplD+n1EKuY6Ri5eQ25dhV95SXcCy/iJ1XY2an43vQdywmlEUVRp15rEXWFV3Wi6tSjDYfTtGSpDseVBFOEKlM9dfCVm/C1W8hCiTk1" +
        "wDywhDy8Bg8soRtD/EKB4tGDI5iNg0ZbC70+0u+hvV4IF20sU4fJZfH7I0g2XODgtTssvb6PrC6hdydBSWYGJgKHNexNYf0c9mBMvbUPj25GgCdqvo+YjpMg" +
        "4NhypXm7lQeKHgyHyMIgDMuaHmK2XkevX4M3XkPffJN6axs9PAoLWPTCdTrX5EvScEJaSo6KtA2CSiFFsQAyKEKckdMz2sYI6Qw4attF06eK99CzAdOpPe7N" +
        "Q7h+CF+/hQwsZm2AubCCPLIOD6+hm0v4ng0ac3CEbo+hKGEwguEC9D3aN0HrEtaOQjnAr6xx9Nw1+h9+O5OyBzcmMAGmArWFtQsUC0P8V7+IrmzAYBh2G7bd" +
        "WdMajmoYz2Ayi8kU0B/A2hpm2EfqI+zWTfSVK+jVy+j169TbO+hkFoEBg5gCKQOqmjd2N7Vz8SF/iUOpOixxGmrMFKUOiRjqQp+DtK09XYyvLbp7H8ypl7aj" +
        "sTbtPIUEvNXgbk/g5hi+eQMzLJHNRczD69inzqGPbOL7JX5nDLtjOJhBfwQjD6MF6PWjuQDsANbWme1PKf7fF+g98QBu5Tw6HIArETPA7G3hv/QV3HAJTp0O" +
        "QrW98BkzhcMZ7E9Do2Htw65YXsesL2HqQ+TNy/Di8+irr1DfuYefTBuTJWKg6LeEtWqW0TF9Uy/R3G2rybhAOlfmFFV8raquQOjF39apkS1Yy5AlNj4AbbrC" +
        "JWbHmrrdY/0xVLpSkd1ERkJ4rpXHv7EHr+0gf3UVe2aZ4j2X0Pc/intgA3/vAA4mMPHBqS4JDIbBX5QDGAHnhFp7yDdfx5Q3McNlUIvuH1IfzdD1s3B2ExYW" +
        "YDAIu2umyMEU3T1CZh41FpZXMGfWsfu3kK/8Bf6736a+eTs0IkqYJSi2h6bmc19lNXJpEQLfVrpUswkrJjLhvDS4oORDRjTgwpqG5cVSfpx21a3+4I93rrfj" +
        "ZCJjOoVc4lv005gQFZkESZsGggahvrkHf/4dzBdfxn7gcczPvRu3tILe2oG9Q6gEVmxAMm0f7QksGORsD11cw23vw/4kXNfyOlxcDTtnOITRKCxaDexO0N0j" +
        "cIL2BnBuk6JXI1/6DO7LX0Z398CUgSViTeiJm826vcQ+o152GslP4iwmiJq5difNR6rVqsxCJdYiYYxjlu3m/VLNvDeOD18iCL8dI6Adjo8Y35CiMBo6bSIT" +
        "QgoDvQI9nFH/i29jvnuV4m99lPqxB9Hr28h4inIYhioW/fDoFyg96C0gC2uh8uVjZGNLKPvQ7wfzhQkLtDsBZ8JCXjpHeetl/Kd/n/q169H590MPVwLZsmbx" +
        "ThSYw9Cx/6Cd0RKZ3G2H4FuM2QEVfBiAKr7A6yHezVA1AWKVbOrL/DiwsPPyQRYqvlt4T7WElOs07INQkGn4PzH8k8Ki/RJ35xD/P/4Fxa98BPfT78O/uQWT" +
        "Gg4n6FIPKXqBa0QJVtHSIy5l2BGxlIDrIwYOK9ibhehnOMQ8dJbiu1/E/dGncTOP9IahWF+3YBr5pJScjpNmTGg2FEok0iszwpfRzjQuzSHqOLIn1tMVrw5R" +
        "VwSjaGzLMTlh6RpQzoQZqFmrp8yTajsTp7TxD6EOG5IqjA+7wGnoyHEKvRJ6BfUffoFy5ql/7oP463fhcALFEF0YRCevTfUtuCLTErQIJA+dViEsrUKEIw+d" +
        "p/jG56g+/WnU9sPujv1wSegSO3+OzbbLfqd517BqRkMw2VSukPs0YXQ+B0/jKIVYqTIqtgCNmG23p7r16sdbRvNQtdktec1As52jvn1uaOoNksp/RT59pEQH" +
        "A6o//SLlaET17HvRa3fCIvQXQoyu2sIETbXfRtjDhM88dLEmbJEHzlL+4MvUf/RHqB0g02mI+2N2m+YHqcuHiEStnwvDmxYryaGKtFBxFqq2fW3abRRo51GE" +
        "1NsTIEIxmMipzagVeVdHO1vTZ1+rbUM1pjsKLAlepduj6k27VX1kJWiXfyqE6lb9x/8f5YXzzE5vwr39ELcvDSPaKO01+bYWrNgg3KM4PfjMacrda/hP/yFe" +
        "CmQ2jYNHsl5e33b6BMZlhw5yjAGu2vaMSWdIbMSTTBqFLcd2U1MPCH1V3quvDKIuFEBF26aHOQybzNQondcFia2cWe9wU9h2bRdlSty8C0mRSxhLgAOofIAu" +
        "ZmEkgq88/tP/kqIoQ0w/qcKiWRsiFilijF7EkDliStM6fM5wAbtcoH/yB9QHs/Ad07ozXkdr18AQmqAHlawmEhu0Y9lLsr64vMv/GIH3mCmf6w6V2IlmTGXC" +
        "QGzx89T5Dk1bmeuAaatm0uCFZHXf9qK1IfimLnPXjAMwShwVFgGwhMfMQs9IfeVNzJe/jmysB+HVDqwNyGqqVYsEsM/Y8N5pAOTk7CnMc1+gfvGHoX4xncXO" +
        "f9+24M5HPTEfTf1sDfmsueVsZJqfY7vND03POAs50TfD2jyqYhBRvA+MxfCCtlSTE/jywlyDnT/W9XjMb6Quw9T4lkaGudT8oc2cBU1DoKahY9994avYgwMY" +
        "DZFZHHZOjmaalpYy88jEweIyVg/wX/g8asrwWXXs9nHtfLhO7wOR66oO9a65L9U2Cmrbp7K6uQrHpJT3QTeOtdslKkYsot7gxWOQUJiRvBCQeX596/j2ftHT" +
        "/CSUvD2UfISZhpAynz9ahUn17u4u5hvfQlaXQ3SjEcxreEC2HX9ZhSRRTq9gvvtV/K07AUbIRqmpz+dWpH4F30z3Uq/H6PSaSGcdyklahLZrNPO3XapQPhgg" +
        "+M1KvdZgxDRTdJWMyAkn94roCdr+VsI/DsWmJrbUXZ4mpST8XbQdBiKzGmyBf+472FkFpgjmy4Rws9Ml6QjjdHp9bDFDv/G14COqujvbNA4Mz6dfzff+dsi3" +
        "+UyJpmcikRakO9WlYYvnedQJEpT2j0N/gNOqM8liLqw/3k2k+aTOE3sB3rLTULJmvtyx1RndI+0Csbg37yCXr8LCKEQxuRlKz72GySTLi8ibV3CvXw+Vt6ru" +
        "Dpj13daq+a5+Mgp/2BGuQQM0Y8m15cxua00TnGiXntI0bUhsQlA/w6szzVSkjE2XEbLb8lqnHypmtbSz9+epecRuks5snk6lKKX2fo76Mj+LQsPsiu/9ANPv" +
        "BQGYNtxrhODCgAyz0Ee+/038ZNpOxMpmFB1rN5ovXx3DeHIubds/q3qCJegomOv4xE6fpjTUQw0myLTHgORMZpHUSMHxGftop+GiNTH5IpjuWHivc9Uu04wn" +
        "03xSetalT10jpsC//CpmfBiAs9TI3RTWJcT1RYlxY/wLLwQCbV13mw5pc41W4L4xK5zYTCInPE5oV50zzZonsnNGJJ6bI4j3BsMUvIpiwrgv6Qwb16xlv9lC" +
        "nIDwNVmi6W5L1RNORMnOAUi7JUZD6lw78iCVB0Xwd7aQ11+Hfi/OhjMZ3V1CVLM4Qu5dx9+6jRqbjVbLRu3gOkzlY+VC7U58jMO62im7+WjMk9qQGg8ciQiR" +
        "WR2VWSLJwcbIbWrEG49HVdRrXgkTsl4nPYZA3NfJit7Hb5hO3U3yBgjVOQrfXE3aKzqr4KWXMWUZB/lkfkDDaRwy7MGrL6Id85PH+dnINNVj/eFJ2KJ5lhvL" +
        "i5KNJs52S86Cbnb+3CiKTrNHWAOHd5VXrYyadIwULgH9Ot9Udry1+b4HcHRbVU/y5D7rbfUZD1VPbhGNc6QxFv3hq0g1iXP7s6/3wYIaqdBXX6IzZDyNzicb" +
        "Q5Yzd7QFyaSTs9CWYPPybG56Ml+SZkwoJ1Ahmm6m2DVujEO1IrKjwOss7BibbRfNaBxtnaCt39jjx29E29n0/opk9JsTMkY5ydllDjNBGrUP4ejN25g7twOv" +
        "P+00p2EUWFli9u+ib7wRMmPnOxPcG57/sYG8wWyqmLlItDt0VjMUQETe4jwJodMWl3HA2ghSK/A1orURH87qUqdVmpF/zLnMJRWC/hhHlGW9YXqS5ujJiVze" +
        "+pTN7hQlMCuuvBoqaxluK05h0EduvIbf2WvGmDXv70Tl3flE7Thl/6PzmQzzSriZnBCcdPxBwg7T3yp4773x6lCtDb6egdRMjyYktnqqdEUnF1py5uz2ffth" +
        "5zTad6dldYlL9zNTc+3+Lo0GU/TFl4OwpGWrqg/YnF5+ORR5Gh6/HouAuhGbHg8o7tNY3mb0cnzi1rFaiHSed6yCtTCdONAJYpxxwgGwJ3u72/TK0D1obNsX" +
        "hYmRXlbrFZNtqeN5QF6smR9m0R2QevwMIUGOTSnXlJgZi16+itnbC9cpbWe7qY7QK6+G7DdFUvMTz+fM5Y911mDeHdlRuc50iBbzj4qr0rbkiomgYToSa3/3" +
        "nhcOwKmhchN6vZneun5PjEEHQ1HVua5GyT5c2nZ8sW91zsj9LZPIfRy6Ht/NKXJxdZgNd/tuCEd7sYbkHZQFsnUTf+sWYuKIyHmh3y9sVLnPtc27K2nnAIrM" +
        "3bccB4CSDzStgkp/IMYW6J3b9yh7Myo3NbiqsqPlyl+78oZMJjNWVkW8a9nB0s5w0FR6a9jDcp9+2mwSz0nd8ScKRbNuQrpRRhZS6tEMXnwpHFhIME1SWOTq" +
        "D9GDcQxJ06BV7cwp5cSM5K2En0dtbYgpnXqsdF7Xpn0rni+TLAcKyyvCdOJ489qbpr8wQ+uJoUbpl5W8ef2G3r1zXTbPBS9oQqsm1rSr2zyyjSh6shnKD0Kb" +
        "JyPTPbHqeJkz1WfpDP2mDuds6vMvYI7qcG0qiK/Rl78fWQ1VFvv748TYJsjJZhzNJY5N9j8XGvso3FaRpDOZsSUhmLalNZ2yhFPZ2ISdrdt6+40bMihnzGRi" +
        "MDpDZepxW/KD7z4va6fQstf298Y5O+lcyEbzTWa3xdzf1Ei3UafZjgmTUr3P3umOD8b5QJKyBf7Vq5jrbwQ/4MHu3kVffTUc2poOkshGRuqPiG70hNBY5w97" +
        "y3ZvAHFyOn5mGeICNPIykSFuSzXrp5FXX3rF1/Vd4BCjU4Nj4urxmI0zE/fcl79t9vencua84J1ibeD1JMds2pPk1CS/YBpgrlMCuo/N19yGyv2iV+niWjlE" +
        "reD3DjGf+1fY0mIWF5Cv/yV+ayeQAdIYeuc7/KUTo5sTDtTTuXBSjtupeA8mE37LAJTECCyKUL0rilAR3NgUZlPnv/XV51hdP3CVm1D7qqCajTHlHku9kb5x" +
        "7aq88J1vm/d+4Fn/5rVAXbAuamJoXtCYdYqGYRviM0JWW3U+ASGUzmDWLpKaOPvMgWDxs3044VZrD1IhZUn1uc9j7+1CUVB//bkQh86q7NiRue8+VrsI1+yb" +
        "jFdiZJQEn40ckDhqSppqVtuE0hzoFpRUm4PdouJaC6725uHHDS+/8EP3+uXL9sy5ys0mR9Ru3zJY6EOvQFzJwlJPr7y8Z97/kQ9oURTsbCG2kOaclfxk06YD" +
        "JA3Qbu1iax/zyMBw4tGVnVPrdG6R8p2i7efG+dP+8lX8lSuo2KZ5u8me81FhnOSnpIPV6PyU3fk5Qsn2m5yIbLOzxIr25NWyhLIIDxQ5cw67vIH+8e/9qSov" +
        "qndbTOodSrNl2ViCsVrQPv2+5daNQ/rDJXnfh57QW9dV0niUTvabh6PaAZpaCNu0oygzQbe8GtMip/MCpzs2pmHVpZaHVMoswuQvyatdvl2AthTbFXYeTkoX" +
        "wGyj+2zUgsbzj9tBIyY2mEThF/EAt6IIulwWSFlCUaCF9fbpZw1f/eK33Nf/8i/s8uotndY7WN1lt9qzHBwog4UStX20FruxOfTffu6uefSJp+Sxp9a4ftWr" +
        "KUR0DuvIb0jC6eNdHCjqUWdqSnzEcFbyCemZLdW5vKOlPmbuXNvzwHK0U7OhUmGZA+84cVjns9ROZJeuL2b/adSC5AM70rGFjfaH51IWSC9qflGERnFfq3nX" +
        "+4y5e/uu//3/+Xdl9dR1qWe7WlU7+HKHavMwZDOzBcEawdpS0YLeUMyL39sx737/M3rqTI9bb6qUpbSTaaSrtUa6UUAWfjZTRuLNaf775qhYExcohm/QbHUR" +
        "CfP6RTpOXtLC6HEsSTpRWNsjps2ULmlZ29IGE43wUxTTDBTMhW2aAzwlOlqSxpe2Eb76mZpHnsT2R17/j//pf6eefk/Ebrtquk1Vb3NU78DLs5jKHnqWNxXv" +
        "DLieLQZ9nR46Lv/wnrz/p97JyorVOze9FKXk2tJmxDKXnJkmkZO0XeMNtmGs6TwkLp5ko2ES5i95tBF3i2RIbaSHtT/NnHaniC0LHTtmJbueZnBgc2227XWI" +
        "QpcU5RRFFH6BljYQg3tR8x98FLt5Udyn/7c/4/VXviQLi/uunt7Bu22KYofpY0fwmrcNDeBoHQqxWNNT77wMR31/99aOuXZlR575ySc5c67g7u0wnaiwjbYk" +
        "oR27GWuQpDnZa2Jt0K5c+HnCl0UVYtpsPP3UZpHoZuXHdlYMC83cgsbOzXRtkn+/LZrfaRNWhjkRmoSf5gkVtnW0RREo8WUBrlYefbvY02fF/9+/91n//L/5" +
        "52bj1D13NLkDbpe63GH/1C58xc2NusKwsTHiaGGRnj2N+nW7uLjhdnc27ObZZ/j1v//rfuP0mr74PS97O+GOvEdc3dK68+ki2ZAPnR9imjNXNZujkHoR5rrF" +
        "FbrJnsiP4CbNxf+qx8+LP+mjEg+q8Rcmnl0jTQdQSkbVhBNUKYoAsqlCv+/lbe8yUrtK/+T3/8y/8oPPm7W1u/5wfJva30HNPcavbYdG49bX50F3wcqlBWZ+" +
        "xEDXobdqB/0NnY431JsnzC/92i/z7ve9zW/dgdcvq06PQp0zO50uHdSGz8/21ePTxXUuA8qFKJwAdnE8P5griWh2FG6+yPmgpRxy0BOnJdI5zDnt7BCGpsmL" +
        "tslyQRVr4ewFkYuPIFdeueM/8wefkf3tb7K4vO0PJ7cQt8XM32Ys2/DatBlWfbzUErne648Nmboh4jYozCnb6605kTV2t8+bp9/7QfnIL3yYMxfW/N49uHUd" +
        "9ve8OBXFE+cLz/UP+Pu09Zw0Qjin87WHKx+rIQvdeXUnCvRkwK8zTGnu7yRneEssrJusGyaVyUzouuH0OZGzD2D292f63Je+5b/y+b+UwfA1yvKeHx/dBHaY" +
        "1ncZHe1x795Rxvo6EQ7LuBfn+ox6yxhWMWaZgmUzGm76vf0VUb1on3n2/bz7/c9w9txpb0D392F/Bw4PoJopdY361LqWjUTOKOty4pBX3xbCj+FK+bHlWTic" +
        "HcAjOVafFj+jER9nFST6h88cfkboNCIqoiJG6PVguCAsryDLa6HXeWd7zIvPv8pzX3pOd7dfYm31htTVtpv5HWCXyWyLxekud+5MGjbaW1bVW5hN4FLJUrWA" +
        "KZapdUTfLNHrr2JYNnt7GyrFJXPh0gUef/JRzj/4MKurK/T6A4pSNFomiSfjtcBdwmLmjjBvTony0akn5rc/1sOszB3IkLQ148BKOtFOXXPSnaaeBcmmHmam" +
        "p+MempqI6UIk06nncH+st2/e5PIPL+urL74iB3uvs7y2JaXZdoezO6ge4P0+9WzMaHGXey8d0XBAuyr3o0aFAz9RsnF1wLQcYPsLiKwgfsH2B8tOzBpHkx7j" +
        "oxWMLMvSyoZZXVvWldUNFpaWKXsLgukjlE0rbLgEE8lgcSRWNH2CaZiwEs811Dj7S6kiHauIVIpenKVWISSyaCgEKB4jBg3jOKXRAiNZ54OIqA9Nbmpik6JT" +
        "oVJVI2FFXRxYV2k1OWRvb6w7W/fY29qR6eSOt3aHpcUDPHtU1RaVHmCYoG4fZJvd8gheqY4PF/23WoC0Ky71WNvrM10aUTLE+BFSjjDFgIJFix04dT0qN6Cu" +
        "+sb5MDPSSF/F9CMykHAug0ihiOBFxahBxGrqfwmjlCUINXHQtVLEipheUGsp4lkmgUAqFKHXWet0vEQa8Rt6cuNWUFdLWCxRZRYGPJhwTkd4by2IV3U1XsNE" +
        "Sa8VIjNsMaNXzijtxJpi6mYuaLmvx1gmOBnjpocc6BhuTbqF4/sg9vz4/+JxCudKlu0AV5b42lLYJYwOC8OwtiY0/VkpbWGHcSp7mMKixmKiNosZhGl81KhY" +
        "jIYx+qFrYIiaKrS+aB+Cb4/niEkzeiWNLffqMBSoFJjUKyIeZYZQo77ASNg16mZeTW2MmjBdlqCd3oPYMlTy4wEtzk9FmMV5SoJTB+4oUmEqV+kBtjrCMaHi" +
        "iMJNGbkJt25NM3PDjyg7y/8POmUA2+tcb0cAAAAASUVORK5CYII="
    )
    const val COMMENT = (
        "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"
    )
    const val SAVE = (
        "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" +
        "6dcSPsD/A/gr8eJvDNYPAAAAAElFTkSuQmCC"
    )
    const val SHARE = (
        "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"
    )
    const val MORE = (
        "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" +
        "AAAAAElFTkSuQmCC"
    )
}

private val Bg = Color(0xFF07080D)
private val Fg = Color(0xFFF4F7FB)
private val Muted = Color(0xFF9AA7B5)
private val Cyan = Color(0xFF2EE6D6)
private val Mint = Color(0xFF7CFFB2)
private val Pink = Color(0xFFFF8AB7)
private val Brand = Brush.linearGradient(listOf(Color(0xFF2EE6D6), Color(0xFF7CFFB2)))
private val Surface = Color(0xFF121218)
private val Elevated = Color(0xFF1A1F2A)

@Composable
private fun BrandPngImage(data: String, modifier: Modifier = Modifier) {
    val bmp = remember(data) {
        val bytes = android.util.Base64.decode(data, android.util.Base64.DEFAULT)
        android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size).asImageBitmap()
    }
    Image(bitmap = bmp, contentDescription = null, modifier = modifier, contentScale = ContentScale.Fit)
}

data class LocalUser(
    val email: String,
    val password: String,
    val name: String,
    val handle: String,
    val bio: String,
    val city: String,
    val photoUri: String,
)

private class AccountStore(ctx: android.content.Context) {
    private val sp = ctx.getSharedPreferences("ClipsAds_users", 0)
    fun current(): LocalUser? = sp.getString("current", null)?.let(::get)
    fun get(email: String): LocalUser? {
        val raw = sp.getString("u:$email", null) ?: return null
        val p = raw.split('\u0001')
        if (p.size < 7) return null
        return LocalUser(p[0], p[1], p[2], p[3], p[4], p[5], p[6])
    }
    fun save(u: LocalUser) {
        sp.edit().putString(
            "u:${u.email}",
            listOf(u.email, u.password, u.name, u.handle, u.bio, u.city, u.photoUri).joinToString("\u0001"),
        ).apply()
    }
    fun setCurrent(email: String) {
        sp.edit().putString("current", email).apply()
    }
    fun logout() {
        sp.edit().remove("current").apply()
    }
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { ClipsAds() }
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
    val videoUrl: String,
    val adYes: Int = 0,
    val adNo: Int = 0,
    val product: Product,
)

private val DemoVideos = listOf(
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
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
        videoUrl = DemoVideos[0],
        adYes = 148,
        adNo = 52,
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
        videoUrl = DemoVideos[1],
        adYes = 90,
        adNo = 30,
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
        videoUrl = DemoVideos[2],
        adYes = 71,
        adNo = 29,
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
        videoUrl = DemoVideos[3],
        adYes = 55,
        adNo = 45,
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
        videoUrl = DemoVideos[4],
        adYes = 42,
        adNo = 18,
        product = Product("Aroma vainilla", "Casa Luz", "9€", "Parla", 90, 77, CtaKind.BUY, "Comprar ahora"),
    ),
)

private fun formatCount(n: Int): String = when {
    n >= 1_000_000 -> String.format("%.1fM", n / 1_000_000f)
    n >= 1_000 -> String.format("%.1fK", n / 1_000f)
    else -> n.toString()
}

@Composable
fun ClipsAds() {
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
        Text("Descubre, opina y Compra Mejor.", color = Muted, fontSize = 13.sp)
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
        GradientButton("Entrar a ClipsAds", Modifier.fillMaxWidth(), onEnter)
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
    val clips = remember { mutableStateListOf<Clip>().also { it.addAll(SampleClips) } }
    val adVotes = remember { mutableStateMapOf<String, Boolean>() }
    var activeClip by remember { mutableStateOf(clips.first()) }

    fun voteAd(id: String, yes: Boolean) {
        if (adVotes[id] == yes) return
        val i = clips.indexOfFirst { it.id == id }
        if (i < 0) return
        val c = clips[i]
        var y = c.adYes
        var n = c.adNo
        when (adVotes[id]) {
            true -> y = (y - 1).coerceAtLeast(0)
            false -> n = (n - 1).coerceAtLeast(0)
            null -> Unit
        }
        if (yes) y += 1 else n += 1
        clips[i] = c.copy(adYes = y, adNo = n)
        adVotes[id] = yes
    }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            val nuevo = Clip(
                id = "u${System.currentTimeMillis()}",
                handle = "tu.clip",
                author = "Tú",
                disclosure = "Tu prueba",
                daysUsed = 1,
                likes = 0,
                comments = 0,
                saves = 0,
                shares = 0,
                posterColor = Color(0xFF12303A),
                videoUrl = uri.toString(),
                product = Product("Tu producto", "Local", "—", "Parla", 80, 70, CtaKind.BUY, "Ver producto"),
            )
            clips.add(0, nuevo)
            tab = Tab.HOME
        }
    }

    Box(Modifier.fillMaxSize().background(Bg)) {
        when (tab) {
            Tab.HOME -> Feed(
                clips = clips,
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
                onUpload = { picker.launch("video/*") },
                adChoice = { id -> adVotes[id] },
                onVoteAd = { id, yes -> voteAd(id, yes) },
            )
            Tab.EXPLORE -> SimpleScreen("Explorar", "Categorías locales · Parla y sur de Madrid")
            Tab.CREATE -> CreateScreen(onPick = { picker.launch("video/*") })
            Tab.CLIPS -> SimpleScreen("Mis clips", "Los que subas aparecen al inicio del feed.")
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
    clips: List<Clip>,
    soundOn: Boolean,
    onToggleSound: () -> Unit,
    liked: List<String>,
    saved: List<String>,
    onLike: (String) -> Unit,
    onSave: (String) -> Unit,
    onOpenSheet: (String, Clip) -> Unit,
    onUpload: () -> Unit,
    adChoice: (String) -> Boolean?,
    onVoteAd: (String, Boolean) -> Unit,
) {
    val listState = rememberLazyListState()
    val playingIndex by remember { derivedStateOf { listState.firstVisibleItemIndex } }
    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            state = listState,
            flingBehavior = rememberSnapFlingBehavior(listState),
            modifier = Modifier.fillMaxSize(),
        ) {
            items(clips, key = { it.id }) { clip ->
                val index = clips.indexOfFirst { it.id == clip.id }
                ClipSlide(
                    clip = clip,
                    playing = index == playingIndex,
                    soundOn = soundOn,
                    liked = clip.id in liked,
                    saved = clip.id in saved,
                    onLike = { onLike(clip.id) },
                    onSave = { onSave(clip.id) },
                    onOpenSheet = { kind -> onOpenSheet(kind, clip) },
                    adChoice = adChoice(clip.id),
                    onVoteAd = { yes -> onVoteAd(clip.id, yes) },
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
                        Icons.Filled.Notifications,
                        contentDescription = "Sonido",
                        tint = if (soundOn) Cyan else Muted,
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
    playing: Boolean,
    soundOn: Boolean,
    liked: Boolean,
    saved: Boolean,
    onLike: () -> Unit,
    onSave: () -> Unit,
    onOpenSheet: (String) -> Unit,
    adChoice: Boolean?,
    onVoteAd: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(modifier.background(clip.posterColor)) {
        ClipVideo(
            url = clip.videoUrl,
            playing = playing,
            soundOn = soundOn,
            modifier = Modifier.fillMaxSize(),
        )
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
                glyph = BrandGlyph.LIKE,
                label = formatCount(clip.likes + if (liked) 1 else 0),
                active = liked,
                onClick = onLike,
            )
            ActionBtn(BrandGlyph.COMMENT, formatCount(clip.comments)) {
                onOpenSheet("comments")
            }
            ActionBtn(
                glyph = BrandGlyph.SAVE,
                label = formatCount(clip.saves + if (saved) 1 else 0),
                active = saved,
                onClick = onSave,
            )
            ActionBtn(BrandGlyph.SHARE, formatCount(clip.shares)) { onOpenSheet("share") }
            ActionBtn(BrandGlyph.MORE, "") { onOpenSheet("more") }
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
            val (yesPct, noPct) = adPercents(clip.adYes, clip.adNo)
            Spacer(Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "Te gusta esta publicidad",
                    color = Fg,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.ExtraBold,
                    modifier = Modifier.weight(1f),
                    maxLines = 2,
                )
                AdVote("Sí", yesPct, adChoice == true) { onVoteAd(true) }
                Spacer(Modifier.width(4.dp))
                AdVote("No", noPct, adChoice == false) { onVoteAd(false) }
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

private enum class BrandGlyph { LIKE, COMMENT, SAVE, SHARE, MORE }

@Composable
private fun ActionBtn(
    glyph: BrandGlyph,
    label: String,
    active: Boolean = false,
    onClick: () -> Unit,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable(onClick = onClick),
    ) {
        Box(Modifier.size(48.dp)) {
            Canvas(Modifier.fillMaxSize()) {
                val w = size.width
                val h = size.height
                val r = w * 0.22f
                drawRoundRect(
                    color = Color(0xFF021018),
                    topLeft = Offset(w * 0.05f, h * 0.10f),
                    size = Size(w * 0.90f, h * 0.86f),
                    cornerRadius = CornerRadius(r, r),
                )
                drawRoundRect(
                    brush = Brush.linearGradient(
                        colors = listOf(Color(0xFF7CFFF6), Color(0xFF1AD4C8), Color(0xFF007A88)),
                        start = Offset(0f, 0f),
                        end = Offset(w, h),
                    ),
                    topLeft = Offset(w * 0.04f, h * 0.02f),
                    size = Size(w * 0.92f, h * 0.88f),
                    cornerRadius = CornerRadius(r, r),
                )
                val inset = w * 0.11f
                drawRoundRect(
                    brush = Brush.linearGradient(
                        colors = if (active)
                            listOf(Color(0xFF0A4A40), Color(0xFF042018))
                        else
                            listOf(Color(0xFF0A3844), Color(0xFF041820)),
                        start = Offset(inset, inset),
                        end = Offset(w - inset, h - inset),
                    ),
                    topLeft = Offset(inset, inset * 0.72f),
                    size = Size(w - inset * 2f, h - inset * 2.15f),
                    cornerRadius = CornerRadius(r * 0.68f, r * 0.68f),
                )
                drawRoundRect(
                    color = Color.White.copy(alpha = 0.22f),
                    topLeft = Offset(w * 0.16f, h * 0.09f),
                    size = Size(w * 0.52f, h * 0.14f),
                    cornerRadius = CornerRadius(r, r),
                )
                val accent = if (active) Color(0xFF7CFFB2) else Color(0xFF2EE6D6)
                val cx = w / 2f
                val cy = h / 2f - h * 0.02f
                val stroke = Stroke(width = w * 0.07f, cap = StrokeCap.Round, join = StrokeJoin.Round)
                when (glyph) {
                    BrandGlyph.LIKE -> {
                        val p = Path().apply {
                            moveTo(cx + w * 0.03f, cy - h * 0.18f)
                            lineTo(cx - w * 0.12f, cy + h * 0.01f)
                            lineTo(cx - w * 0.01f, cy + h * 0.01f)
                            lineTo(cx - w * 0.05f, cy + h * 0.20f)
                            lineTo(cx + w * 0.14f, cy - h * 0.01f)
                            lineTo(cx + w * 0.02f, cy - h * 0.01f)
                            close()
                        }
                        drawPath(p, accent)
                    }
                    BrandGlyph.COMMENT -> {
                        drawRoundRect(
                            color = accent,
                            topLeft = Offset(cx - w * 0.18f, cy - h * 0.15f),
                            size = Size(w * 0.26f, h * 0.18f),
                            cornerRadius = CornerRadius(w * 0.05f, w * 0.05f),
                        )
                        drawRoundRect(
                            color = accent.copy(alpha = 0.88f),
                            topLeft = Offset(cx - w * 0.02f, cy - h * 0.02f),
                            size = Size(w * 0.22f, h * 0.15f),
                            cornerRadius = CornerRadius(w * 0.045f, w * 0.045f),
                        )
                    }
                    BrandGlyph.SAVE -> {
                        drawLine(
                            accent,
                            Offset(cx, cy - h * 0.16f),
                            Offset(cx, cy + h * 0.04f),
                            strokeWidth = w * 0.07f,
                            cap = StrokeCap.Round,
                        )
                        val arrow = Path().apply {
                            moveTo(cx - w * 0.09f, cy - h * 0.02f)
                            lineTo(cx, cy + h * 0.09f)
                            lineTo(cx + w * 0.09f, cy - h * 0.02f)
                        }
                        drawPath(arrow, accent, style = stroke)
                        drawLine(
                            accent,
                            Offset(cx - w * 0.12f, cy + h * 0.15f),
                            Offset(cx + w * 0.12f, cy + h * 0.15f),
                            strokeWidth = w * 0.07f,
                            cap = StrokeCap.Round,
                        )
                    }
                    BrandGlyph.SHARE -> {
                        val a = Offset(cx + w * 0.11f, cy - h * 0.12f)
                        val b = Offset(cx - w * 0.12f, cy)
                        val cpt = Offset(cx + w * 0.11f, cy + h * 0.12f)
                        drawLine(accent, a, b, strokeWidth = w * 0.055f, cap = StrokeCap.Round)
                        drawLine(accent, b, cpt, strokeWidth = w * 0.055f, cap = StrokeCap.Round)
                        drawCircle(accent, radius = w * 0.055f, center = a)
                        drawCircle(accent, radius = w * 0.055f, center = b)
                        drawCircle(accent, radius = w * 0.055f, center = cpt)
                    }
                    BrandGlyph.MORE -> {
                        val gap = w * 0.11f
                        for (i in -1..1) {
                            for (j in -1..1) {
                                drawCircle(
                                    accent,
                                    radius = w * 0.032f,
                                    center = Offset(cx + i * gap, cy + j * gap),
                                )
                            }
                        }
                    }
                }
            }
            if (active) {
                Box(
                    Modifier
                        .align(Alignment.BottomEnd)
                        .padding(3.dp)
                        .size(13.dp)
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

private fun adPercents(yes: Int, no: Int): Pair<Int, Int> {
    val total = yes + no
    if (total <= 0) return 0 to 0
    val y = (yes * 100f / total).toInt()
    return y to (100 - y)
}

@Composable
private fun AdVote(label: String, pct: Int, on: Boolean, onClick: () -> Unit) {
    Box(
        Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(if (on) Mint else Color.Black.copy(alpha = 0.4f))
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 5.dp),
    ) {
        Text(
            "$label $pct%",
            color = if (on) Bg else Fg,
            fontSize = 10.sp,
            fontWeight = FontWeight.ExtraBold,
        )
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
                else -> "ClipsAds"
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
private fun CreateScreen(onPick: () -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .background(Bg)
            .statusBarsPadding()
            .padding(20.dp),
    ) {
        Text("Publicar clip", color = Fg, fontSize = 24.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Text(
            "Elige un vídeo de la galería. Se añadirá al inicio del feed.",
            color = Muted,
            fontSize = 14.sp,
        )
        Spacer(Modifier.height(20.dp))
        GradientButton("Elegir vídeo de la galería", Modifier.fillMaxWidth(), onPick)
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

private class LoopVideoView(context: android.content.Context) : VideoView(context) {
    var player: MediaPlayer? = null
}

@Composable
private fun ClipVideo(
    url: String,
    playing: Boolean,
    soundOn: Boolean,
    modifier: Modifier = Modifier,
) {
    AndroidView(
        modifier = modifier,
        factory = { ctx ->
            LoopVideoView(ctx).apply {
                layoutParams = android.view.ViewGroup.LayoutParams(
                    android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                    android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                )
                setOnPreparedListener { mp ->
                    player = mp
                    mp.isLooping = true
                    val vol = if (soundOn) 1f else 0f
                    mp.setVolume(vol, vol)
                    if (playing) start()
                }
                setOnErrorListener { _, _, _ -> true }
            }
        },
        update = { view ->
            val v = view as LoopVideoView
            if (v.tag != url) {
                v.tag = url
                v.setVideoURI(Uri.parse(url))
            }
            val vol = if (soundOn) 1f else 0f
            v.player?.setVolume(vol, vol)
            if (playing) {
                if (!v.isPlaying) v.start()
            } else if (v.isPlaying) {
                v.pause()
            }
        },
    )
}
