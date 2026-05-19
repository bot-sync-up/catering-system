package co.il.catering.presentation.screens.agent

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import co.il.catering.domain.model.Lead
import co.il.catering.domain.model.LeadStage
import co.il.catering.domain.repository.CrmRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class LeadDetailViewModel @Inject constructor(
    handle: SavedStateHandle,
    private val repo: CrmRepository,
) : ViewModel() {
    private val leadId: String = handle["leadId"] ?: ""
    private val _lead = MutableStateFlow<Lead?>(null)
    val lead: StateFlow<Lead?> = _lead.asStateFlow()
    init { viewModelScope.launch { repo.lead(leadId).onSuccess { _lead.value = it } } }

    fun advance(stage: LeadStage) {
        val curr = _lead.value ?: return
        viewModelScope.launch {
            repo.saveLead(curr.copy(stage = stage)).onSuccess { _lead.value = it }
        }
    }
}

@Composable
fun LeadDetailScreen(
    leadId: String,
    onBack: () -> Unit,
    vm: LeadDetailViewModel = hiltViewModel(),
) {
    val lead by vm.lead.collectAsStateWithLifecycle()
    val ctx = LocalContext.current
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(lead?.name ?: "ליד") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "חזור") }
                },
            )
        },
    ) { padding ->
        val l = lead
        if (l == null) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = androidx.compose.ui.Alignment.Center) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }
        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(l.name, style = MaterialTheme.typography.titleLarge)
            Text("שלב: ${l.stage.name}")
            l.phone?.let { phone ->
                Button(onClick = {
                    val i = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))
                    ctx.startActivity(i)
                }) {
                    Icon(Icons.Default.Phone, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text("חייג $phone")
                }
            }
            l.notes?.let { Text(it) }
            Spacer(Modifier.height(16.dp))
            Text("קדם לשלב הבא:", style = MaterialTheme.typography.titleMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                LeadStage.values().forEach { st ->
                    AssistChip(onClick = { vm.advance(st) }, label = { Text(st.name) })
                }
            }
        }
    }
}
