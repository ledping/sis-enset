# Generated for SIS ENSET v10.0 WebRTC calls
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AppelInterne',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type_appel', models.CharField(choices=[('audio', 'Audio'), ('video', 'Video')], default='audio', max_length=10)),
                ('statut', models.CharField(choices=[('sonnerie', 'En sonnerie'), ('actif', 'En cours'), ('refuse', 'Refuse'), ('manque', 'Manque'), ('termine', 'Termine'), ('annule', 'Annule')], default='sonnerie', max_length=20)),
                ('started_at', models.DateTimeField(auto_now_add=True)),
                ('answered_at', models.DateTimeField(blank=True, null=True)),
                ('ended_at', models.DateTimeField(blank=True, null=True)),
                ('duree_secondes', models.PositiveIntegerField(default=0)),
                ('appelant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='appels_lances', to=settings.AUTH_USER_MODEL)),
                ('destinataire', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='appels_recus', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Appel interne',
                'verbose_name_plural': 'Appels internes',
                'ordering': ['-started_at'],
            },
        ),
        migrations.CreateModel(
            name='SignalAppel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type_signal', models.CharField(choices=[('incoming', 'Appel entrant'), ('accepted', 'Accepte'), ('refused', 'Refuse'), ('offer', 'Offre WebRTC'), ('answer', 'Reponse WebRTC'), ('ice', 'Candidat ICE'), ('ended', 'Termine'), ('cancelled', 'Annule')], max_length=20)),
                ('payload', models.JSONField(blank=True, default=dict)),
                ('lu', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('appel', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='signaux', to='appels.appelinterne')),
                ('destinataire', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='signaux_recus', to=settings.AUTH_USER_MODEL)),
                ('emetteur', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='signaux_envoyes', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Signal appel',
                'verbose_name_plural': 'Signaux appels',
                'ordering': ['created_at'],
                'indexes': [models.Index(fields=['destinataire', 'lu', 'created_at'], name='appels_sign_destina_e40f65_idx'), models.Index(fields=['appel', 'created_at'], name='appels_sign_appel_i_ee4d09_idx')],
            },
        ),
    ]
